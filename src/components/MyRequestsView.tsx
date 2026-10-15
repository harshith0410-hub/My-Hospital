import React, { useState, useEffect } from 'react';
import {
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Building2,
  ChevronRight,
  RotateCcw,
  Ban,
  ShieldCheck,
  Calendar,
} from 'lucide-react';
import { AdmissionRequest } from '../lib/types.ts';
import { api } from '../lib/api.ts';

interface MyRequestsViewProps {
  requests: AdmissionRequest[];
  onRefresh: () => void;
  onSelectHospital: (hospitalId: string) => void;
}

export const MyRequestsView: React.FC<MyRequestsViewProps> = ({
  requests,
  onRefresh,
  onSelectHospital,
}) => {
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<AdmissionRequest | null>(null);

  // Live timer tick for reservation holds
  const [nowTime, setNowTime] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNowTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  async function handleCancel(requestId: string) {
    if (!window.confirm('Are you sure you want to cancel this admission request? Any held bed reservation will be immediately released.')) {
      return;
    }
    setCancellingId(requestId);
    try {
      await api.cancelAdmissionRequest(requestId);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel request');
    } finally {
      setCancellingId(null);
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'Submitted':
        return {
          bg: 'bg-blue-50 text-blue-700 border-blue-200',
          icon: <Clock className="w-3.5 h-3.5 text-blue-600" />,
          label: 'Submitted (Awaiting Triage)',
        };
      case 'Under Review':
        return {
          bg: 'bg-amber-50 text-amber-800 border-amber-200',
          icon: <RotateCcw className="w-3.5 h-3.5 text-amber-600 animate-spin" />,
          label: 'Under Staff Review',
        };
      case 'Accepted':
        return {
          bg: 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold',
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />,
          label: 'Accepted (Bed Hold Active)',
        };
      case 'Declined':
        return {
          bg: 'bg-rose-50 text-rose-800 border-rose-200',
          icon: <XCircle className="w-3.5 h-3.5 text-rose-600" />,
          label: 'Declined by Hospital',
        };
      case 'Cancelled':
        return {
          bg: 'bg-slate-100 text-slate-600 border-slate-200',
          icon: <Ban className="w-3.5 h-3.5 text-slate-500" />,
          label: 'Cancelled by Patient',
        };
      case 'Expired':
        return {
          bg: 'bg-slate-100 text-slate-600 border-slate-200',
          icon: <Clock className="w-3.5 h-3.5 text-slate-400" />,
          label: 'Bed Hold Expired',
        };
      case 'Completed':
        return {
          bg: 'bg-teal-50 text-teal-800 border-teal-200',
          icon: <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />,
          label: 'Patient Checked In / Completed',
        };
      default:
        return {
          bg: 'bg-slate-100 text-slate-700 border-slate-200',
          icon: <AlertCircle className="w-3.5 h-3.5 text-slate-500" />,
          label: status,
        };
    }
  }

  function formatCountdown(expiresAtIso?: string) {
    if (!expiresAtIso) return null;
    const diff = new Date(expiresAtIso).getTime() - nowTime;
    if (diff <= 0) return 'Expired';
    const totalSecs = Math.floor(diff / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Title & Refresh */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <FileText className="w-6 h-6 text-blue-600" />
            My Admission Requests Tracker
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time status tracking and bed reservation verification across regional facilities.
          </p>
        </div>

        <button
          onClick={onRefresh}
          className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Refresh Queue</span>
        </button>
      </div>

      {requests.length === 0 ? (
        <div className="text-center py-16 px-4 bg-white rounded-2xl border border-slate-200 shadow-xs">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No Admission Requests Yet</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
            Search for nearby hospitals, review verified capacities, and submit an admission request when you need clinical coordination.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((req) => {
            const badge = getStatusBadge(req.status);
            const countdown = req.status === 'Accepted' ? formatCountdown(req.reservationExpiresAt) : null;
            const isHoldActive = req.status === 'Accepted' && countdown && countdown !== 'Expired';

            return (
              <div
                key={req.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-slate-300 transition-all"
              >
                <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs font-bold text-slate-500">#{req.id}</span>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badge.bg}`}>
                        {badge.icon}
                        <span>{badge.label}</span>
                      </span>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                        req.acuityLevel === 'emergency'
                          ? 'bg-rose-100 text-rose-800'
                          : req.acuityLevel === 'urgent'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {req.acuityLevel}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-blue-600" />
                      <span>{req.hospitalName}</span>
                    </h3>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Department: <strong className="text-slate-700">{req.specialtyName}</strong>
                      {req.bedCategoryName && (
                        <span> • Bed Category: <strong className="text-slate-700">{req.bedCategoryName}</strong></span>
                      )}
                    </div>
                  </div>

                  {/* Reservation Hold Countdown Banner */}
                  {isHoldActive && (
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950 flex items-center gap-3">
                      <Clock className="w-5 h-5 text-emerald-600 animate-pulse" />
                      <div>
                        <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                          Bed Reservation Hold Active
                        </div>
                        <div className="text-base font-black text-emerald-700 font-mono">
                          {countdown} remaining
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Chief Complaint */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-700 mb-3">
                  <span className="font-semibold text-slate-900">Chief Complaint:</span> {req.chiefComplaint}
                  {req.medicalNotes && (
                    <div className="mt-1 text-slate-500 text-[11px]">
                      Notes: {req.medicalNotes}
                    </div>
                  )}
                  {req.statusReason && (
                    <div className="mt-2 pt-2 border-t border-slate-200 text-blue-800 font-medium">
                      Hospital Response: "{req.statusReason}"
                    </div>
                  )}
                </div>

                {/* Status Timeline History */}
                {req.statusHistory && req.statusHistory.length > 0 && (
                  <div className="pt-2 border-t border-slate-100 mb-3">
                    <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                      Request History:
                    </div>
                    <div className="space-y-1.5">
                      {req.statusHistory.map((hist, idx) => (
                        <div key={idx} className="flex items-center text-xs text-slate-600 gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                          <span className="font-semibold text-slate-800">{hist.status}</span>
                          <span className="text-[11px] text-slate-400">
                            ({new Date(hist.changedAt).toLocaleTimeString()})
                          </span>
                          {hist.reason && <span className="text-slate-500 italic">— {hist.reason}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Footer Controls */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
                  <div className="text-slate-400">
                    Created: {new Date(req.createdAt).toLocaleString()}
                  </div>

                  <div className="flex items-center gap-2">
                    {['Submitted', 'Under Review', 'Accepted'].includes(req.status) && (
                      <button
                        onClick={() => handleCancel(req.id)}
                        disabled={cancellingId === req.id}
                        className="px-3 py-1.5 rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-semibold transition-colors disabled:opacity-50"
                      >
                        {cancellingId === req.id ? 'Cancelling...' : 'Cancel Request'}
                      </button>
                    )}

                    <button
                      onClick={() => onSelectHospital(req.hospitalId)}
                      className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-colors flex items-center gap-1"
                    >
                      <span>View Hospital Profile</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
