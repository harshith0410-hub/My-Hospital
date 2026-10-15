import React, { useState } from 'react';
import {
  Building2,
  MapPin,
  Phone,
  Clock,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  ShieldCheck,
  Stethoscope,
  Bed,
  Info,
  Sparkles,
  Navigation,
  Activity,
} from 'lucide-react';
import { Hospital } from '../lib/types.ts';
import { calculateHospitalMatchScore } from '../lib/matching.ts';

interface HospitalCardProps {
  hospital: Hospital;
  isSelected: boolean;
  onSelect: () => void;
  onOpenDetails: () => void;
  onRequestAdmission: () => void;
  userCoords: { lat: number; lng: number } | null;
  targetSpecialty?: string;
  requireEmergency?: boolean;
  requireIcu?: boolean;
}

export const HospitalCard: React.FC<HospitalCardProps> = ({
  hospital,
  isSelected,
  onSelect,
  onOpenDetails,
  onRequestAdmission,
  userCoords,
  targetSpecialty,
  requireEmergency,
  requireIcu,
}) => {
  const [showScoreInfo, setShowScoreInfo] = useState(false);

  // Calculate matching score
  const match = calculateHospitalMatchScore(hospital, {
    userLat: userCoords?.lat,
    userLng: userCoords?.lng,
    targetSpecialtyId: targetSpecialty,
    requireEmergency,
    requireIcu,
  });

  // Calculate capacity totals
  const totalPhysical = hospital.bedCategories?.reduce((acc, b) => acc + b.physicalCapacity, 0) || 0;
  const totalUsable = hospital.bedCategories?.reduce((acc, b) => acc + b.usableCapacity, 0) || 0;
  const totalOccupied = hospital.bedCategories?.reduce((acc, b) => acc + b.occupiedCount, 0) || 0;
  const totalReserved = hospital.bedCategories?.reduce((acc, b) => acc + b.reservedCount, 0) || 0;
  const totalAvailable = hospital.bedCategories?.reduce((acc, b) => acc + b.availableBeds, 0) || 0;

  // ICU capacity specifically
  const icuCategory = hospital.bedCategories?.find((b) => b.categoryName === 'ICU');
  const icuAvailable = icuCategory?.availableBeds ?? 0;

  // Doctors on duty count
  const doctorsOnDuty = hospital.doctorShifts?.filter((d) => d.isOnDuty).length || 0;

  // Emergency status presentation
  const emergencyBadge = {
    accepting: {
      label: 'Accepting Emergencies',
      bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      dot: 'bg-emerald-500',
    },
    restricted_capacity: {
      label: 'Restricted Capacity',
      bg: 'bg-amber-50 text-amber-800 border-amber-200',
      dot: 'bg-amber-500',
    },
    temporarily_unavailable: {
      label: 'ER Unavailable',
      bg: 'bg-rose-50 text-rose-800 border-rose-200',
      dot: 'bg-rose-500',
    },
    requires_confirmation: {
      label: 'Requires Confirmation',
      bg: 'bg-slate-100 text-slate-700 border-slate-300',
      dot: 'bg-slate-400',
    },
  }[hospital.emergencyStatus] || {
    label: hospital.emergencyStatus,
    bg: 'bg-slate-100 text-slate-700 border-slate-300',
    dot: 'bg-slate-400',
  };

  // Freshness calculation
  const updateDate = new Date(hospital.lastCapacityUpdate || hospital.updatedAt);
  const minutesAgo = Math.max(1, Math.floor((Date.now() - updateDate.getTime()) / 60000));
  const freshnessText =
    minutesAgo < 60
      ? `${minutesAgo}m ago`
      : minutesAgo < 1440
      ? `${Math.floor(minutesAgo / 60)}h ago`
      : `${Math.floor(minutesAgo / 1440)}d ago`;

  return (
    <div
      onClick={onSelect}
      className={`bg-white rounded-2xl border transition-all duration-200 p-5 shadow-xs hover:shadow-md cursor-pointer ${
        isSelected
          ? 'border-blue-600 ring-2 ring-blue-600/20'
          : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      {/* Top Banner: Verification & Demo Tag */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          {hospital.verificationStatus === 'verified' ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
              Verified Profile
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
              Pending Admin Verification
            </span>
          )}

          {hospital.isSimulatedDemo && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
              Simulated Demo Data
            </span>
          )}
        </div>

        {/* Match Score Badge */}
        <div className="relative">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowScoreInfo(!showScoreInfo);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors"
            title="Click to view transparent coordination score factors"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>Match: {match.score}%</span>
            <Info className="w-3 h-3 text-slate-400" />
          </button>

          {showScoreInfo && (
            <div
              className="absolute right-0 top-8 z-30 w-72 p-3 bg-slate-900 text-white rounded-xl shadow-xl text-xs space-y-1.5 border border-slate-700 animate-in fade-in"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="font-bold text-teal-300 pb-1 border-b border-slate-800 flex items-center justify-between">
                <span>Coordination Score Breakdown</span>
                <span className="font-mono text-xs">{match.score}/100</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-tight">
                Ranking based on facility match, distance, and freshness. Not clinical advice.
              </p>
              <ul className="space-y-1 text-[11px] text-slate-200">
                {match.explanation.map((item, i) => (
                  <li key={i} className="flex items-center gap-1.5">
                    <span className="text-teal-400">✓</span> {item}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Hospital Title, Tagline & Locality */}
      <div className="mb-4">
        <h3 className="text-lg font-bold text-slate-950 group-hover:text-blue-700 transition-colors">
          {hospital.name}
        </h3>
        {hospital.tagline && (
          <p className="text-xs font-medium text-slate-500 mt-0.5">{hospital.tagline}</p>
        )}
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 mt-2">
          <div className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span>{hospital.address}, {hospital.locality}</span>
          </div>

          {match.factors.distanceKm !== undefined && (
            <div className="flex items-center gap-1 font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md">
              <Navigation className="w-3 h-3 text-blue-600" />
              <span>{match.factors.distanceKm} km away</span>
            </div>
          )}
        </div>
      </div>

      {/* Emergency Status & Wait Time Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 mb-4">
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${emergencyBadge.bg}`}>
            <span className={`w-2 h-2 rounded-full ${emergencyBadge.dot} animate-pulse`} />
            {emergencyBadge.label}
          </span>
          {hospital.waitingTimeEstimateMinutes !== undefined && (
            <span className="text-xs font-semibold text-slate-600 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              Est. ER Wait: <strong>~{hospital.waitingTimeEstimateMinutes}m</strong>
            </span>
          )}
        </div>

        <div className="text-[11px] text-slate-500 flex items-center gap-1">
          <span>Capacity updated:</span>
          <strong className="text-slate-700">{freshnessText}</strong>
          <span className="text-[10px] text-slate-400">({hospital.informationSource.replace('_', ' ')})</span>
        </div>
      </div>

      {/* Key Capacity Metrics Cards (Single Consistent Capacity Model) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        {/* Available Beds */}
        <div className="p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-100 text-emerald-950">
          <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 flex items-center justify-between">
            <span>Available Beds</span>
            <Bed className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-xl font-extrabold text-emerald-700 mt-0.5">
            {totalAvailable}
          </div>
          <div className="text-[10px] text-emerald-800 font-medium">
            of {totalUsable} usable beds
          </div>
        </div>

        {/* ICU Available */}
        <div className="p-2.5 rounded-xl bg-blue-50/60 border border-blue-100 text-blue-950">
          <div className="text-[10px] font-bold uppercase tracking-wider text-blue-700 flex items-center justify-between">
            <span>ICU Available</span>
            <Activity className="w-3.5 h-3.5 text-blue-600" />
          </div>
          <div className="text-xl font-extrabold text-blue-700 mt-0.5">
            {icuAvailable}
          </div>
          <div className="text-[10px] text-blue-800 font-medium">
            {icuCategory ? `${icuCategory.occupiedCount} occupied, ${icuCategory.reservedCount} hold` : 'Not configured'}
          </div>
        </div>

        {/* Duty Specialists */}
        <div className="p-2.5 rounded-xl bg-purple-50/60 border border-purple-100 text-purple-950">
          <div className="text-[10px] font-bold uppercase tracking-wider text-purple-700 flex items-center justify-between">
            <span>Doctors on Duty</span>
            <Stethoscope className="w-3.5 h-3.5 text-purple-600" />
          </div>
          <div className="text-xl font-extrabold text-purple-700 mt-0.5">
            {doctorsOnDuty}
          </div>
          <div className="text-[10px] text-purple-800 font-medium">
            Active shift roster
          </div>
        </div>

        {/* Diagnostic Services */}
        <div className="p-2.5 rounded-xl bg-teal-50/60 border border-teal-100 text-teal-950">
          <div className="text-[10px] font-bold uppercase tracking-wider text-teal-700">
            <span>Diagnostics</span>
          </div>
          <div className="text-xs font-bold text-teal-900 mt-1 space-y-0.5">
            <div>CT: {hospital.services?.find((s) => s.serviceKey === 'ct_scan')?.isOperational ? '● Ready' : '○ Unavailable'}</div>
            <div>MRI: {hospital.services?.find((s) => s.serviceKey === 'mri')?.isOperational ? '● Ready' : '○ Offline'}</div>
          </div>
        </div>
      </div>

      {/* Specialties Tags */}
      {hospital.departments && hospital.departments.length > 0 && (
        <div className="mb-4">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            Reported Departments & Specialties ({hospital.departments.length}):
          </div>
          <div className="flex flex-wrap gap-1.5">
            {hospital.departments.slice(0, 5).map((dept) => {
              const isMatch = targetSpecialty && (dept.specialtyName.toLowerCase().includes(targetSpecialty.toLowerCase()) || dept.specialtyId === targetSpecialty);
              return (
                <span
                  key={dept.id}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-medium border ${
                    isMatch
                      ? 'bg-blue-600 text-white border-blue-600 font-bold'
                      : 'bg-slate-100 text-slate-700 border-slate-200'
                  }`}
                >
                  {dept.specialtyName}
                </span>
              );
            })}
            {hospital.departments.length > 5 && (
              <span className="px-1.5 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-500">
                +{hospital.departments.length - 5} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Footer Contact & Action Buttons */}
      <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 text-xs text-slate-600">
          <a
            href={`tel:${hospital.emergencyPhone}`}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 font-bold text-rose-700 hover:underline"
            title="Emergency telephone line"
          >
            <Phone className="w-3.5 h-3.5 text-rose-600" />
            <span>ER: {hospital.emergencyPhone}</span>
          </a>
          <span className="text-slate-300">|</span>
          <span className="text-slate-500">{hospital.generalPhone}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenDetails();
            }}
            className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors flex items-center gap-1"
          >
            <span>Inspect Facilities</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRequestAdmission();
            }}
            className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-xs flex items-center gap-1"
          >
            <span>Submit Admission Request</span>
          </button>
        </div>
      </div>
    </div>
  );
};
