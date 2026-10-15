import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Building2,
  Users,
  Activity,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Plus,
  Search,
  Lock,
  FileText,
  Clock,
  Sparkles,
} from 'lucide-react';
import { Hospital, UserProfile, Specialty, AuditLog } from '../lib/types.ts';
import { api } from '../lib/api.ts';

interface AdminConsoleProps {
  currentUser: UserProfile;
  hospitals: Hospital[];
  onRefreshHospitals: () => void;
}

export const AdminConsole: React.FC<AdminConsoleProps> = ({
  currentUser,
  hospitals,
  onRefreshHospitals,
}) => {
  const [activeTab, setActiveTab] = useState<'stats' | 'hospitals' | 'users' | 'specialties' | 'audit'>('stats');
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // New Specialty form
  const [newSpecialtyName, setNewSpecialtyName] = useState('');
  const [newSpecialtyDesc, setNewSpecialtyDesc] = useState('');

  // Selected user for role change
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [newRole, setNewRole] = useState<'patient' | 'hospital_staff' | 'admin'>('hospital_staff');
  const [assignedHospitalId, setAssignedHospitalId] = useState(hospitals[0]?.id || '');

  async function loadData() {
    setIsLoading(true);
    try {
      const [statsData, usersData, specsData, auditData] = await Promise.all([
        api.getAdminStats(),
        api.getAdminUsers(),
        api.getAdminSpecialties(),
        api.getAdminAuditLogs(),
      ]);
      setStats(statsData);
      setUsers(usersData);
      setSpecialties(specsData);
      setAuditLogs(auditData);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleVerify(hospitalId: string, status: 'verified' | 'unverified' | 'suspended') {
    try {
      await api.verifyHospital(hospitalId, status);
      setMessage(`Hospital status updated to ${status}.`);
      onRefreshHospitals();
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to update verification');
    }
  }

  async function handleUpdateRole(e: React.FormEvent) {
    e.preventDefault();
    if (!editingUserId) return;
    try {
      await api.updateUserRole(editingUserId, newRole, newRole === 'hospital_staff' ? assignedHospitalId : undefined);
      setMessage('User role and institutional assignment successfully updated.');
      setEditingUserId(null);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to update user role');
    }
  }

  async function handleAddSpecialty(e: React.FormEvent) {
    e.preventDefault();
    if (!newSpecialtyName) return;
    try {
      await api.addSpecialty(newSpecialtyName, newSpecialtyDesc);
      setMessage(`Specialty "${newSpecialtyName}" added to the database.`);
      setNewSpecialtyName('');
      setNewSpecialtyDesc('');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to add specialty');
    }
  }

  async function handleToggleSpecialty(id: string, current: boolean) {
    try {
      await api.toggleSpecialty(id, !current);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to toggle specialty');
    }
  }

  async function handleResetSeed() {
    if (!window.confirm('Reset database to synthetic demo dataset? All test changes will revert to defaults.')) return;
    try {
      await api.resetDemoSeed();
      setMessage('Database reset to clean demo seed dataset.');
      onRefreshHospitals();
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to reset seed');
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-800 border border-purple-200 flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5 text-purple-600" />
              Institutional Administrator Console
            </span>
            <span className="text-xs text-slate-500">Admin: <strong>{currentUser.fullName}</strong></span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            System Administration & Audit
          </h1>
          <p className="text-xs text-slate-500">
            Enforce healthcare data integrity, role-based privileges, and hospital verification.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleResetSeed}
            className="px-3 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-xs font-bold text-rose-800 flex items-center gap-1.5 transition-colors"
            title="Reset database to demo seed data"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Demo Data</span>
          </button>

          <button
            onClick={loadData}
            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {message && (
        <div className="mb-4 p-3 rounded-xl bg-purple-50 border border-purple-200 text-purple-900 text-xs flex items-center justify-between animate-in fade-in">
          <span>{message}</span>
          <button onClick={() => setMessage(null)} className="font-bold text-purple-700">✕</button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap border-b border-slate-200 mb-6 gap-2">
        <button
          onClick={() => setActiveTab('stats')}
          className={`py-2.5 px-4 text-xs font-bold rounded-t-xl border-b-2 flex items-center gap-1.5 ${
            activeTab === 'stats' ? 'border-purple-600 text-purple-800 bg-purple-50/50' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Activity className="w-4 h-4" /> System Health
        </button>

        <button
          onClick={() => setActiveTab('hospitals')}
          className={`py-2.5 px-4 text-xs font-bold rounded-t-xl border-b-2 flex items-center gap-1.5 ${
            activeTab === 'hospitals' ? 'border-purple-600 text-purple-800 bg-purple-50/50' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Building2 className="w-4 h-4" /> Hospital Verification Queue
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`py-2.5 px-4 text-xs font-bold rounded-t-xl border-b-2 flex items-center gap-1.5 ${
            activeTab === 'users' ? 'border-purple-600 text-purple-800 bg-purple-50/50' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4" /> User & Role Management
        </button>

        <button
          onClick={() => setActiveTab('specialties')}
          className={`py-2.5 px-4 text-xs font-bold rounded-t-xl border-b-2 flex items-center gap-1.5 ${
            activeTab === 'specialties' ? 'border-purple-600 text-purple-800 bg-purple-50/50' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Sparkles className="w-4 h-4" /> Specialties Directory
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`py-2.5 px-4 text-xs font-bold rounded-t-xl border-b-2 flex items-center gap-1.5 ${
            activeTab === 'audit' ? 'border-purple-600 text-purple-800 bg-purple-50/50' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Clock className="w-4 h-4" /> Audit Logs
        </button>
      </div>

      {/* TAB 1: SYSTEM HEALTH STATS */}
      {activeTab === 'stats' && stats && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <div className="text-[11px] font-bold text-slate-500 uppercase">Verified Hospitals</div>
              <div className="text-3xl font-black text-blue-600 mt-1">{stats.verifiedHospitals}</div>
              <div className="text-xs text-slate-500 mt-1">out of {stats.totalHospitals} total</div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <div className="text-[11px] font-bold text-slate-500 uppercase">Unverified Queue</div>
              <div className="text-3xl font-black text-amber-600 mt-1">{stats.unverifiedHospitals}</div>
              <div className="text-xs text-slate-500 mt-1">pending admin inspection</div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <div className="text-[11px] font-bold text-slate-500 uppercase">Stale Capacity Alert</div>
              <div className="text-3xl font-black text-rose-600 mt-1">{stats.staleCapacityCount}</div>
              <div className="text-xs text-slate-500 mt-1">&gt;24h without update</div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <div className="text-[11px] font-bold text-slate-500 uppercase">Active Bed Holds</div>
              <div className="text-3xl font-black text-emerald-600 mt-1">{stats.activeReservations}</div>
              <div className="text-xs text-slate-500 mt-1">reservation holds active</div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: HOSPITAL VERIFICATION QUEUE */}
      {activeTab === 'hospitals' && (
        <div className="space-y-3">
          <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Hospital Name</th>
                  <th className="py-3 px-3">Locality</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Data Freshness</th>
                  <th className="py-3 px-4 text-right">Verification Controls</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {hospitals.map((hosp) => (
                  <tr key={hosp.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{hosp.name}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{hosp.id}</div>
                    </td>
                    <td className="py-3 px-3 text-slate-600">{hosp.locality}, {hosp.city}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        hosp.verificationStatus === 'verified'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : hosp.verificationStatus === 'suspended'
                          ? 'bg-rose-50 text-rose-800 border border-rose-200'
                          : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}>
                        {hosp.verificationStatus}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-500 text-[11px]">
                      {hosp.lastCapacityUpdate ? new Date(hosp.lastCapacityUpdate).toLocaleString() : 'Never'}
                    </td>
                    <td className="py-3 px-4 text-right space-x-1.5">
                      {hosp.verificationStatus !== 'verified' && (
                        <button
                          onClick={() => handleVerify(hosp.id, 'verified')}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold"
                        >
                          Verify Profile
                        </button>
                      )}
                      {hosp.verificationStatus !== 'suspended' && (
                        <button
                          onClick={() => handleVerify(hosp.id, 'suspended')}
                          className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold"
                        >
                          Suspend
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: USER & ROLE MANAGEMENT */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-xs text-purple-900">
            <strong>Privilege Enforcement:</strong> Users can never self-assign privileged hospital_staff or admin roles. Only administrators can delegate permissions.
          </div>

          <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-3">Email</th>
                  <th className="py-3 px-3">Current Role</th>
                  <th className="py-3 px-3">Assigned Hospital</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-bold text-slate-900">{u.fullName}</td>
                    <td className="py-3 px-3 text-slate-600 font-mono text-[11px]">{u.email}</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800 uppercase">
                        {u.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-500">
                      {u.assignedHospitalId
                        ? hospitals.find((h) => h.id === u.assignedHospitalId)?.name || u.assignedHospitalId
                        : '—'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => {
                          setEditingUserId(u.id);
                          setNewRole(u.role);
                          setAssignedHospitalId(u.assignedHospitalId || hospitals[0]?.id || '');
                        }}
                        className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold"
                      >
                        Modify Role
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {editingUserId && (
            <form onSubmit={handleUpdateRole} className="p-4 rounded-2xl bg-white border border-slate-300 shadow-md max-w-lg space-y-3">
              <h4 className="text-xs font-bold text-slate-900">Update User Permissions</h4>
              <div>
                <label className="block text-xs text-slate-600 mb-1">Select Role</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as any)}
                  className="w-full p-2 text-xs border border-slate-300 rounded-xl"
                >
                  <option value="patient">Patient (Standard discovery & admission)</option>
                  <option value="hospital_staff">Hospital Staff (Manage bed capacity & triage)</option>
                  <option value="admin">System Administrator (Full platform access)</option>
                </select>
              </div>

              {newRole === 'hospital_staff' && (
                <div>
                  <label className="block text-xs text-slate-600 mb-1">Assign to Hospital Facility</label>
                  <select
                    value={assignedHospitalId}
                    onChange={(e) => setAssignedHospitalId(e.target.value)}
                    className="w-full p-2 text-xs border border-slate-300 rounded-xl"
                  >
                    {hospitals.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name} ({h.locality})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingUserId(null)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
                >
                  Save Permission Assignment
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* TAB 4: SPECIALTIES DIRECTORY */}
      {activeTab === 'specialties' && (
        <div className="space-y-4">
          <form onSubmit={handleAddSpecialty} className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Add Medical Specialty</label>
              <input
                type="text"
                required
                value={newSpecialtyName}
                onChange={(e) => setNewSpecialtyName(e.target.value)}
                placeholder="e.g. Geriatric Medicine"
                className="w-full p-2 text-xs border border-slate-300 rounded-xl"
              />
            </div>
            <div className="flex-1 min-w-[250px]">
              <label className="block text-xs font-semibold text-slate-700 mb-1">Clinical Scope / Description</label>
              <input
                type="text"
                value={newSpecialtyDesc}
                onChange={(e) => setNewSpecialtyDesc(e.target.value)}
                placeholder="Specialized geriatric consultation and chronic care"
                className="w-full p-2 text-xs border border-slate-300 rounded-xl"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-xs"
            >
              Add Specialty
            </button>
          </form>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {specialties.map((spec) => (
              <div key={spec.id} className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
                <div>
                  <div className="font-bold text-xs text-slate-900">{spec.name}</div>
                  <div className="text-[11px] text-slate-500 truncate max-w-[200px]">{spec.description}</div>
                </div>
                <button
                  onClick={() => handleToggleSpecialty(spec.id, spec.isActive)}
                  className={`px-2 py-1 rounded text-[10px] font-bold ${
                    spec.isActive
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {spec.isActive ? 'Active' : 'Disabled'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: AUDIT LOGS */}
      {activeTab === 'audit' && (
        <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-3">Actor</th>
                <th className="py-3 px-3">Role</th>
                <th className="py-3 px-3">Action</th>
                <th className="py-3 px-3">Entity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              {auditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-4 text-slate-500">{new Date(log.timestamp).toLocaleString()}</td>
                  <td className="py-2.5 px-3 text-slate-800 font-semibold">{log.actorEmail}</td>
                  <td className="py-2.5 px-3">
                    <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-100 text-slate-700">
                      {log.actorRole}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-purple-700 font-bold">{log.action}</td>
                  <td className="py-2.5 px-3 text-slate-600">{log.entityType} ({log.entityId})</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
