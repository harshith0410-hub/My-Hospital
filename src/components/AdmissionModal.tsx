import React, { useState } from 'react';
import {
  X,
  FileText,
  AlertTriangle,
  Building2,
  Bed,
  CheckCircle2,
  Clock,
  User,
  Phone,
  AlertCircle,
} from 'lucide-react';
import { Hospital, UserProfile, AdmissionRequest } from '../lib/types.ts';
import { api } from '../lib/api.ts';

interface AdmissionModalProps {
  hospital: Hospital | null;
  currentUser: UserProfile | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (request: AdmissionRequest) => void;
  onOpenAuth: () => void;
}

export const AdmissionModal: React.FC<AdmissionModalProps> = ({
  hospital,
  currentUser,
  isOpen,
  onClose,
  onSuccess,
  onOpenAuth,
}) => {
  const [departmentId, setDepartmentId] = useState('');
  const [bedCategoryId, setBedCategoryId] = useState('');
  const [acuityLevel, setAcuityLevel] = useState<'routine' | 'urgent' | 'emergency'>('urgent');
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [medicalNotes, setMedicalNotes] = useState('');
  const [patientName, setPatientName] = useState(currentUser?.fullName || '');
  const [patientPhone, setPatientPhone] = useState(currentUser?.phone || '');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync state if currentUser changes
  React.useEffect(() => {
    if (currentUser) {
      if (!patientName) setPatientName(currentUser.fullName);
      if (!patientPhone && currentUser.phone) setPatientPhone(currentUser.phone);
    }
  }, [currentUser]);

  // Set default department
  React.useEffect(() => {
    if (hospital && hospital.departments && hospital.departments.length > 0 && !departmentId) {
      setDepartmentId(hospital.departments[0].id);
    }
    if (hospital && hospital.bedCategories && hospital.bedCategories.length > 0 && !bedCategoryId) {
      setBedCategoryId(hospital.bedCategories[0].id);
    }
  }, [hospital]);

  if (!isOpen || !hospital) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!hospital) {
      setError('Hospital is required.');
      return;
    }

    if (!currentUser) {
      onOpenAuth();
      return;
    }

    if (!departmentId) {
      setError('Please select a hospital department.');
      return;
    }

    if (!chiefComplaint || chiefComplaint.trim().length < 5) {
      setError('Please describe the primary reason / chief complaint for admission (min 5 characters).');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.submitAdmissionRequest({
        hospitalId: hospital.id,
        departmentId,
        bedCategoryId: bedCategoryId || undefined,
        acuityLevel,
        chiefComplaint,
        medicalNotes,
        patientName,
        patientPhone,
      });

      onSuccess(res.request);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to submit admission request.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="admission-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <div>
              <h2 id="admission-modal-title" className="text-base font-bold text-slate-900">
                Submit Admission Request
              </h2>
              <p className="text-xs text-slate-500 font-medium">To: {hospital.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close admission modal"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Emergency Disclaimer Banner */}
        <div className="px-6 py-2.5 bg-rose-50 border-b border-rose-100 text-rose-900 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>
            <strong>Emergency Warning:</strong> Do not delay urgent emergency transport while awaiting digital coordination. If symptoms are severe or life-threatening, proceed to the nearest emergency department immediately.
          </span>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {!currentUser && (
            <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-center justify-between">
              <div>
                <span className="font-bold">Authentication Required:</span> You need a patient account to submit and track admission requests.
              </div>
              <button
                type="button"
                onClick={onOpenAuth}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors"
              >
                Sign In / Register
              </button>
            </div>
          )}

          {/* Patient Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Patient Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  placeholder="Sarah Connor"
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Phone</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="tel"
                  required
                  value={patientPhone}
                  onChange={(e) => setPatientPhone(e.target.value)}
                  placeholder="+1 (555) 012-3456"
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Department / Specialty */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Target Department / Specialty</label>
            <select
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              required
              className="w-full py-2 px-3 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-hidden bg-white"
            >
              <option value="">Select Hospital Department</option>
              {hospital.departments?.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.specialtyName} {dept.floorLocation ? `(${dept.floorLocation})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Bed Category preference */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Requested Bed Category (Optional)</label>
            <select
              value={bedCategoryId}
              onChange={(e) => setBedCategoryId(e.target.value)}
              className="w-full py-2 px-3 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-hidden bg-white"
            >
              <option value="">No preference / Clinical triage assigns</option>
              {hospital.bedCategories?.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.categoryName} ({cat.availableBeds} beds currently available)
                </option>
              ))}
            </select>
          </div>

          {/* Acuity Level */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Acuity Level</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setAcuityLevel('routine')}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all text-center ${
                  acuityLevel === 'routine'
                    ? 'bg-blue-50 border-blue-400 text-blue-700 ring-2 ring-blue-200'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Routine
              </button>
              <button
                type="button"
                onClick={() => setAcuityLevel('urgent')}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all text-center ${
                  acuityLevel === 'urgent'
                    ? 'bg-amber-50 border-amber-400 text-amber-800 ring-2 ring-amber-200'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Urgent
              </button>
              <button
                type="button"
                onClick={() => setAcuityLevel('emergency')}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all text-center ${
                  acuityLevel === 'emergency'
                    ? 'bg-rose-50 border-rose-400 text-rose-800 ring-2 ring-rose-200'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Emergency
              </button>
            </div>
          </div>

          {/* Chief Complaint */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Chief Complaint / Primary Symptoms *
            </label>
            <textarea
              required
              rows={3}
              value={chiefComplaint}
              onChange={(e) => setChiefComplaint(e.target.value)}
              placeholder="Describe primary symptoms, pain location, onset duration, and acuity..."
              className="w-full p-2.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
            />
          </div>

          {/* Medical Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Additional Clinical Notes / Allergies (Optional)
            </label>
            <textarea
              rows={2}
              value={medicalNotes}
              onChange={(e) => setMedicalNotes(e.target.value)}
              placeholder="Known allergies, preexisting medical conditions, current medications..."
              className="w-full p-2.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting || !currentUser}
              className="w-full py-3 px-4 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <span>Submitting Admission Request...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Transmit Admission Request to {hospital.name.split(' ')[0]}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
