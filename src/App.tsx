import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar.tsx';
import { DiscoveryHero } from './components/DiscoveryHero.tsx';
import { HospitalCard } from './components/HospitalCard.tsx';
import { HospitalMap } from './components/HospitalMap.tsx';
import { HospitalDetailModal } from './components/HospitalDetailModal.tsx';
import { AdmissionModal } from './components/AdmissionModal.tsx';
import { AuthModal } from './components/AuthModal.tsx';
import { MyRequestsView } from './components/MyRequestsView.tsx';
import { StaffDashboard } from './components/StaffDashboard.tsx';
import { AdminConsole } from './components/AdminConsole.tsx';
import { NotificationCenter } from './components/NotificationCenter.tsx';
import { SpecialtiesView } from './components/SpecialtiesView.tsx';
import { api, getStoredToken, setStoredToken } from './lib/api.ts';
import { useRealtime, RealtimeEvent } from './lib/useRealtime.ts';
import { Hospital, Specialty, UserProfile, AdmissionRequest, InAppNotification } from './lib/types.ts';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

export default function App() {
  // Navigation & User State
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [activeView, setActiveView] = useState<'discovery' | 'specialties' | 'requests' | 'staff' | 'admin'>('discovery');

  // Core Data
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [myRequests, setMyRequests] = useState<AdmissionRequest[]>([]);
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [isLoadingHospitals, setIsLoadingHospitals] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('');
  const [emergencyOnly, setEmergencyOnly] = useState(false);
  const [icuOnly, setIcuOnly] = useState(false);
  const [viewMode, setViewMode] = useState<'split' | 'list' | 'map'>('split');

  // Geolocation
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Selection & Modals
  const [selectedHospitalId, setSelectedHospitalId] = useState<string | null>(null);
  const [detailHospital, setDetailHospital] = useState<Hospital | null>(null);
  const [admissionHospital, setAdmissionHospital] = useState<Hospital | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'signin' | 'register'>('signin');
  const [notifCenterOpen, setNotifCenterOpen] = useState(false);

  // Toast feedback
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = useCallback((text: string, type: 'success' | 'info' | 'error' = 'info') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  }, []);

  // Fetch Hospitals
  const loadHospitals = useCallback(async () => {
    try {
      const data = await api.getHospitals({
        search: searchQuery || undefined,
        specialty: selectedSpecialty || undefined,
        emergency: emergencyOnly || undefined,
      });
      setHospitals(data);
      if (data.length > 0 && !selectedHospitalId) {
        setSelectedHospitalId(data[0].id);
      }
    } catch (err: any) {
      console.error('Error fetching hospitals:', err);
    } finally {
      setIsLoadingHospitals(false);
    }
  }, [searchQuery, selectedSpecialty, emergencyOnly, selectedHospitalId]);

  // Fetch Specialties
  const loadSpecialties = useCallback(async () => {
    try {
      const data = await api.getSpecialties();
      setSpecialties(data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  // Fetch Current User
  const loadMe = useCallback(async () => {
    const token = getStoredToken();
    if (!token) return;
    try {
      const res = await api.getMe();
      setCurrentUser(res.user);
    } catch (err) {
      setStoredToken(null);
      setCurrentUser(null);
    }
  }, []);

  // Fetch User Requests
  const loadMyRequests = useCallback(async () => {
    if (!currentUser) return;
    try {
      const data = await api.getMyAdmissions();
      setMyRequests(data);
    } catch (err) {
      console.error(err);
    }
  }, [currentUser]);

  // Fetch Notifications
  const loadNotifications = useCallback(async () => {
    if (!currentUser) return;
    try {
      const data = await api.getNotifications();
      setNotifications(data);
    } catch (err) {
      console.error(err);
    }
  }, [currentUser]);

  // Real-time Event Listener via SSE
  const handleRealtimeEvent = useCallback(
    (event: RealtimeEvent) => {
      // Refresh relevant data when real-time events fire
      if (['capacity.updated', 'hospital.updated', 'reservation.expired', 'database.reset'].includes(event.type)) {
        loadHospitals();
      }
      if (['admission.created', 'admission.updated', 'reservation.expired'].includes(event.type)) {
        loadMyRequests();
        loadNotifications();
      }
      if (event.type === 'notification.created') {
        loadNotifications();
      }
    },
    [loadHospitals, loadMyRequests, loadNotifications]
  );

  const { isConnected: isRealtimeConnected } = useRealtime(handleRealtimeEvent);

  // Initial Load
  useEffect(() => {
    loadMe();
    loadSpecialties();
  }, [loadMe, loadSpecialties]);

  useEffect(() => {
    loadHospitals();
  }, [loadHospitals]);

  useEffect(() => {
    if (currentUser) {
      loadMyRequests();
      loadNotifications();
    } else {
      setMyRequests([]);
      setNotifications([]);
    }
  }, [currentUser, loadMyRequests, loadNotifications]);

  // Use My Location action
  function handleUseMyLocation() {
    setLocationError(null);
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
      setUserCoords({ lat: 37.7749, lng: -122.4194 }); // Default to Metro San Francisco coordinates
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        showToast('Location identified. Distances and sorting updated.', 'success');
      },
      (err) => {
        setLocationError('Location permission denied or unavailable. Using central coordinates.');
        // Graceful fallback to default SF center coordinates without breaking
        setUserCoords({ lat: 37.7749, lng: -122.4194 });
      },
      { timeout: 8000 }
    );
  }

  // Quick Role Switcher
  async function handleSwitchDemoUser(role: 'patient' | 'hospital_staff' | 'admin' | 'guest') {
    if (role === 'guest') {
      await api.logout().catch(() => {});
      setStoredToken(null);
      setCurrentUser(null);
      setActiveView('discovery');
      showToast('Switched to Guest explorer mode.', 'info');
      return;
    }

    const emailMap = {
      patient: 'patient@demo.org',
      hospital_staff: 'staff@metrohealth.org',
      admin: 'admin@myhospital.org',
    };

    try {
      const res = await api.login(emailMap[role]);
      setStoredToken(res.token);
      setCurrentUser(res.user);
      if (role === 'patient') setActiveView('requests');
      else if (role === 'hospital_staff') setActiveView('staff');
      else if (role === 'admin') setActiveView('admin');
      showToast(`Signed in as demo ${res.user.fullName} (${res.user.role})`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to switch demo role', 'error');
    }
  }

  async function handleLogout() {
    await api.logout().catch(() => {});
    setStoredToken(null);
    setCurrentUser(null);
    setActiveView('discovery');
    showToast('Signed out successfully.', 'info');
  }

  // Filter hospitals by ICU if toggled
  const filteredHospitals = hospitals.filter((h) => {
    if (icuOnly) {
      const icu = h.bedCategories?.find((b) => b.categoryName === 'ICU');
      return icu && icu.availableBeds > 0;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900 font-sans">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed top-4 right-4 z-50 p-3 rounded-xl shadow-xl border text-xs font-semibold flex items-center gap-2 animate-in slide-in-from-top-4 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
              : toastMessage.type === 'error'
              ? 'bg-rose-50 text-rose-900 border-rose-300'
              : 'bg-blue-50 text-blue-900 border-blue-300'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          ) : (
            <AlertCircle className="w-4 h-4 text-blue-600" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Main Navbar */}
      <Navbar
        currentUser={currentUser}
        onOpenAuth={(initialTab) => {
          setAuthModalTab(initialTab || 'signin');
          setAuthModalOpen(true);
        }}
        onLogout={handleLogout}
        onSwitchDemoUser={handleSwitchDemoUser}
        activeView={activeView}
        onChangeView={setActiveView}
        notifications={notifications}
        onOpenNotifications={() => setNotifCenterOpen(true)}
        isRealtimeConnected={isRealtimeConnected}
        activeRequestsCount={myRequests.filter((r) => ['Submitted', 'Under Review', 'Accepted'].includes(r.status)).length}
      />

      {/* Content Area Based on Active View */}
      <main className="flex-1">
        {activeView === 'discovery' && (
          <div>
            <DiscoveryHero
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              selectedSpecialty={selectedSpecialty}
              onSpecialtyChange={setSelectedSpecialty}
              specialties={specialties}
              emergencyOnly={emergencyOnly}
              onEmergencyOnlyChange={setEmergencyOnly}
              icuOnly={icuOnly}
              onIcuOnlyChange={setIcuOnly}
              userCoords={userCoords}
              onUseMyLocation={handleUseMyLocation}
              locationError={locationError}
              onClearLocationError={() => setLocationError(null)}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              totalResultsCount={filteredHospitals.length}
            />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              {viewMode === 'split' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  {/* Results List */}
                  <div className="lg:col-span-6 space-y-4">
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                      <span className="font-bold uppercase tracking-wider text-slate-600">
                        Hospital Directory List
                      </span>
                      <span>Click to highlight on map</span>
                    </div>

                    {filteredHospitals.length === 0 ? (
                      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
                        <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                        <h4 className="font-bold text-slate-800">No Matching Facilities Found</h4>
                        <p className="text-xs text-slate-500 mt-1">
                          Try adjusting your search terms or clearing specialty filters.
                        </p>
                      </div>
                    ) : (
                      filteredHospitals.map((hospital) => (
                        <HospitalCard
                          key={hospital.id}
                          hospital={hospital}
                          isSelected={hospital.id === selectedHospitalId}
                          onSelect={() => setSelectedHospitalId(hospital.id)}
                          onOpenDetails={() => setDetailHospital(hospital)}
                          onRequestAdmission={() => setAdmissionHospital(hospital)}
                          userCoords={userCoords}
                          targetSpecialty={selectedSpecialty}
                          requireEmergency={emergencyOnly}
                          requireIcu={icuOnly}
                        />
                      ))
                    )}
                  </div>

                  {/* Synchronized Interactive Map */}
                  <div className="lg:col-span-6 sticky top-20">
                    <HospitalMap
                      hospitals={filteredHospitals}
                      selectedHospitalId={selectedHospitalId}
                      onSelectHospital={(id) => setSelectedHospitalId(id)}
                      onOpenDetails={(hosp) => setDetailHospital(hosp)}
                      userCoords={userCoords}
                    />
                  </div>
                </div>
              )}

              {viewMode === 'list' && (
                <div className="max-w-4xl mx-auto space-y-4">
                  {filteredHospitals.map((hospital) => (
                    <HospitalCard
                      key={hospital.id}
                      hospital={hospital}
                      isSelected={hospital.id === selectedHospitalId}
                      onSelect={() => setSelectedHospitalId(hospital.id)}
                      onOpenDetails={() => setDetailHospital(hospital)}
                      onRequestAdmission={() => setAdmissionHospital(hospital)}
                      userCoords={userCoords}
                      targetSpecialty={selectedSpecialty}
                      requireEmergency={emergencyOnly}
                      requireIcu={icuOnly}
                    />
                  ))}
                </div>
              )}

              {viewMode === 'map' && (
                <div className="w-full">
                  <HospitalMap
                    hospitals={filteredHospitals}
                    selectedHospitalId={selectedHospitalId}
                    onSelectHospital={(id) => setSelectedHospitalId(id)}
                    onOpenDetails={(hosp) => setDetailHospital(hosp)}
                    userCoords={userCoords}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {activeView === 'specialties' && (
          <SpecialtiesView
            specialties={specialties}
            hospitals={hospitals}
            onSelectSpecialty={(specName) => {
              setSelectedSpecialty(specName);
              setActiveView('discovery');
            }}
          />
        )}

        {activeView === 'requests' && (
          <MyRequestsView
            requests={myRequests}
            onRefresh={loadMyRequests}
            onSelectHospital={(hospId) => {
              const h = hospitals.find((x) => x.id === hospId);
              if (h) setDetailHospital(h);
            }}
          />
        )}

        {activeView === 'staff' && (
          currentUser?.role === 'hospital_staff' || currentUser?.role === 'admin' ? (
            <StaffDashboard
              currentUser={currentUser}
              hospitals={hospitals}
              onRefreshHospitals={loadHospitals}
            />
          ) : (
            <div className="max-w-md mx-auto my-16 p-6 bg-white rounded-2xl border border-slate-200 text-center">
              <h3 className="font-bold text-slate-800">Staff Authentication Required</h3>
              <p className="text-xs text-slate-500 mt-1 mb-4">
                Please sign in with authorized Hospital Staff credentials to access operations.
              </p>
              <button
                onClick={() => handleSwitchDemoUser('hospital_staff')}
                className="px-4 py-2 bg-teal-600 text-white rounded-xl text-xs font-bold"
              >
                Sign In as Marcus Vance, RN (Staff Demo)
              </button>
            </div>
          )
        )}

        {activeView === 'admin' && (
          currentUser?.role === 'admin' ? (
            <AdminConsole
              currentUser={currentUser}
              hospitals={hospitals}
              onRefreshHospitals={loadHospitals}
            />
          ) : (
            <div className="max-w-md mx-auto my-16 p-6 bg-white rounded-2xl border border-slate-200 text-center">
              <h3 className="font-bold text-slate-800">Administrator Access Required</h3>
              <p className="text-xs text-slate-500 mt-1 mb-4">
                This console is restricted to system administrators for audit and institutional verification.
              </p>
              <button
                onClick={() => handleSwitchDemoUser('admin')}
                className="px-4 py-2 bg-purple-600 text-white rounded-xl text-xs font-bold"
              >
                Sign In as Dr. Patricia Hayes (Admin Demo)
              </button>
            </div>
          )
        )}
      </main>

      {/* Hospital Detail Modal */}
      <HospitalDetailModal
        hospital={detailHospital}
        onClose={() => setDetailHospital(null)}
        onRequestAdmission={(hosp) => setAdmissionHospital(hosp)}
      />

      {/* Admission Request Modal */}
      <AdmissionModal
        hospital={admissionHospital}
        currentUser={currentUser}
        isOpen={Boolean(admissionHospital)}
        onClose={() => setAdmissionHospital(null)}
        onSuccess={(req) => {
          showToast(`Admission request #${req.id} transmitted to hospital triage queue.`, 'success');
          loadMyRequests();
          setActiveView('requests');
        }}
        onOpenAuth={() => {
          setAuthModalTab('signin');
          setAuthModalOpen(true);
        }}
      />

      {/* Authentication Modal */}
      <AuthModal
        isOpen={authModalOpen}
        initialTab={authModalTab}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={(user) => {
          setCurrentUser(user);
          showToast(`Welcome back, ${user.fullName}!`, 'success');
        }}
      />

      {/* Notification Center Drawer */}
      <NotificationCenter
        isOpen={notifCenterOpen}
        onClose={() => setNotifCenterOpen(false)}
        notifications={notifications}
        onMarkRead={async (id) => {
          await api.markNotificationRead(id);
          loadNotifications();
        }}
        onNavigate={(url) => {
          if (url.includes('requests')) setActiveView('requests');
          else if (url.includes('admissions')) setActiveView('staff');
        }}
      />

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 text-white py-8 px-4 sm:px-6 lg:px-8 text-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-white text-sm">MyHospital</span>
              <span className="text-teal-400 font-medium">Care Coordination Network</span>
            </div>
            <p className="text-slate-400 text-[11px] mt-1">
              “Find the Right Care. At the Right Time.”
            </p>
          </div>

          <div className="text-slate-400 text-[11px] text-center md:text-right max-w-xl">
            <strong>Important Clinical Disclaimer:</strong> MyHospital coordinates facility discoveries and bed capacity reporting. Information presented does not guarantee admission or triage priority. In emergencies, call 911 immediately.
          </div>
        </div>
      </footer>
    </div>
  );
}
