import React, { useState } from 'react';
import {
  Activity,
  MapPin,
  Bell,
  User,
  LogOut,
  ShieldAlert,
  Building2,
  FileText,
  Search,
  CheckCircle2,
  ChevronDown,
} from 'lucide-react';
import { UserProfile, InAppNotification } from '../lib/types.ts';

interface NavbarProps {
  currentUser: UserProfile | null;
  onOpenAuth: (initialTab?: 'signin' | 'register') => void;
  onLogout: () => void;
  onSwitchDemoUser: (role: 'patient' | 'hospital_staff' | 'admin' | 'guest') => void;
  activeView: 'discovery' | 'specialties' | 'requests' | 'staff' | 'admin';
  onChangeView: (view: 'discovery' | 'specialties' | 'requests' | 'staff' | 'admin') => void;
  notifications: InAppNotification[];
  onOpenNotifications: () => void;
  isRealtimeConnected: boolean;
  activeRequestsCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onOpenAuth,
  onLogout,
  onSwitchDemoUser,
  activeView,
  onChangeView,
  notifications,
  onOpenNotifications,
  isRealtimeConnected,
  activeRequestsCount = 0,
}) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showDemoMenu, setShowDemoMenu] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Tagline */}
          <div className="flex items-center gap-6">
            <button
              onClick={() => onChangeView('discovery')}
              className="flex items-center gap-2.5 text-left group focus:outline-hidden"
              aria-label="MyHospital Home"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 to-teal-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
                {/* Combined medical cross + location pin */}
                <div className="relative flex items-center justify-center">
                  <MapPin className="w-6 h-6 stroke-[2.2]" />
                  <Activity className="w-3 h-3 absolute -top-0.5 text-teal-200 animate-pulse" />
                </div>
              </div>
              <div>
                <span className="font-extrabold text-xl tracking-tight text-slate-900 group-hover:text-blue-700 transition-colors">
                  MyHospital
                </span>
                <span className="hidden sm:block text-[11px] font-semibold uppercase tracking-wider text-teal-700">
                  Care Coordination Network
                </span>
              </div>
            </button>

            {/* Navigation links */}
            <nav className="hidden md:flex items-center gap-1">
              <button
                onClick={() => onChangeView('discovery')}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5 ${
                  activeView === 'discovery'
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Search className="w-4 h-4" />
                Find Hospitals
              </button>

              <button
                onClick={() => onChangeView('specialties')}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5 ${
                  activeView === 'specialties'
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Activity className="w-4 h-4" />
                Specialties
              </button>

              {currentUser && (
                <button
                  onClick={() => onChangeView('requests')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5 relative ${
                    activeView === 'requests'
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  My Requests
                  {activeRequestsCount > 0 && (
                    <span className="ml-1 px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-blue-600 text-white">
                      {activeRequestsCount}
                    </span>
                  )}
                </button>
              )}

              {currentUser?.role === 'hospital_staff' && (
                <button
                  onClick={() => onChangeView('staff')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5 ${
                    activeView === 'staff'
                      ? 'bg-teal-50 text-teal-800'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Building2 className="w-4 h-4 text-teal-600" />
                  Staff Operations
                </button>
              )}

              {currentUser?.role === 'admin' && (
                <button
                  onClick={() => onChangeView('admin')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5 ${
                    activeView === 'admin'
                      ? 'bg-purple-50 text-purple-800'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <ShieldAlert className="w-4 h-4 text-purple-600" />
                  Admin Console
                </button>
              )}
            </nav>
          </div>

          {/* Right Controls: Realtime indicator, Demo selector, Notifications, Auth */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Live Realtime Sync Status Indicator */}
            <div
              className={`hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                isRealtimeConnected
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : 'bg-amber-50 border-amber-200 text-amber-700'
              }`}
              title={isRealtimeConnected ? 'Real-time database updates active' : 'Connecting real-time sync...'}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isRealtimeConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                }`}
              />
              <span>{isRealtimeConnected ? 'Live Sync' : 'Connecting'}</span>
            </div>

            {/* Quick Demo Role Switcher */}
            <div className="relative">
              <button
                onClick={() => setShowDemoMenu(!showDemoMenu)}
                className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 flex items-center gap-1.5 transition-colors"
                title="Quickly switch between pre-seeded test roles"
              >
                <span className="text-slate-500 hidden sm:inline">Role:</span>
                <span className="font-bold text-blue-700">
                  {currentUser ? (currentUser.role === 'admin' ? 'Admin' : currentUser.role === 'hospital_staff' ? 'Staff' : 'Patient') : 'Guest'}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
              </button>

              {showDemoMenu && (
                <div
                  className="absolute right-0 mt-1 w-64 bg-white rounded-xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in slide-in-from-top-2"
                  onMouseLeave={() => setShowDemoMenu(false)}
                >
                  <div className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 mb-1">
                    Quick Role Switcher
                  </div>
                  <button
                    onClick={() => {
                      onSwitchDemoUser('patient');
                      setShowDemoMenu(false);
                    }}
                    className={`w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium flex items-center justify-between hover:bg-blue-50 hover:text-blue-700 ${
                      currentUser?.role === 'patient' ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-700'
                    }`}
                  >
                    <div>
                      <div className="font-semibold">Sarah Connor (Patient)</div>
                      <div className="text-[10px] text-slate-500">Discover hospitals & submit admission</div>
                    </div>
                    {currentUser?.role === 'patient' && <CheckCircle2 className="w-4 h-4 text-blue-600" />}
                  </button>
                  <button
                    onClick={() => {
                      onSwitchDemoUser('hospital_staff');
                      setShowDemoMenu(false);
                    }}
                    className={`w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium flex items-center justify-between hover:bg-teal-50 hover:text-teal-800 ${
                      currentUser?.role === 'hospital_staff' ? 'bg-teal-50 text-teal-800 font-bold' : 'text-slate-700'
                    }`}
                  >
                    <div>
                      <div className="font-semibold">Marcus Vance (Staff)</div>
                      <div className="text-[10px] text-slate-500">Metro Health triage & bed capacity</div>
                    </div>
                    {currentUser?.role === 'hospital_staff' && <CheckCircle2 className="w-4 h-4 text-teal-600" />}
                  </button>
                  <button
                    onClick={() => {
                      onSwitchDemoUser('admin');
                      setShowDemoMenu(false);
                    }}
                    className={`w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium flex items-center justify-between hover:bg-purple-50 hover:text-purple-800 ${
                      currentUser?.role === 'admin' ? 'bg-purple-50 text-purple-800 font-bold' : 'text-slate-700'
                    }`}
                  >
                    <div>
                      <div className="font-semibold">Dr. Patricia Hayes (Admin)</div>
                      <div className="text-[10px] text-slate-500">Hospital verification & audit logs</div>
                    </div>
                    {currentUser?.role === 'admin' && <CheckCircle2 className="w-4 h-4 text-purple-600" />}
                  </button>
                  <div className="border-t border-slate-100 my-1"></div>
                  <button
                    onClick={() => {
                      onSwitchDemoUser('guest');
                      setShowDemoMenu(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs text-slate-600 hover:bg-slate-100 ${
                      !currentUser ? 'bg-slate-100 font-bold' : ''
                    }`}
                  >
                    Browse as Guest (Signed Out)
                  </button>
                </div>
              )}
            </div>

            {/* Notification Bell */}
            {currentUser && (
              <button
                onClick={onOpenNotifications}
                className="relative p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors focus:outline-hidden"
                aria-label="View notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
            )}

            {/* User Profile or Sign In */}
            {currentUser ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 border border-slate-200 transition-colors focus:outline-hidden"
                  aria-label="User profile menu"
                >
                  <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                    {currentUser.fullName.charAt(0)}
                  </div>
                  <span className="hidden sm:block text-xs font-medium text-slate-700 max-w-[120px] truncate">
                    {currentUser.fullName}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {showUserMenu && (
                  <div
                    className="absolute right-0 mt-1 w-56 bg-white rounded-xl shadow-xl border border-slate-200 p-2 z-50"
                    onMouseLeave={() => setShowUserMenu(false)}
                  >
                    <div className="px-3 py-2 border-b border-slate-100">
                      <div className="text-xs font-bold text-slate-900 truncate">{currentUser.fullName}</div>
                      <div className="text-[11px] text-slate-500 truncate">{currentUser.email}</div>
                      <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-blue-100 text-blue-800 uppercase tracking-wide">
                        {currentUser.role.replace('_', ' ')}
                      </span>
                    </div>

                    <div className="py-1">
                      {currentUser.role === 'patient' && (
                        <button
                          onClick={() => {
                            onChangeView('requests');
                            setShowUserMenu(false);
                          }}
                          className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-100 rounded-md flex items-center gap-2"
                        >
                          <FileText className="w-3.5 h-3.5 text-slate-500" />
                          My Admission Requests
                        </button>
                      )}
                      {currentUser.role === 'hospital_staff' && (
                        <button
                          onClick={() => {
                            onChangeView('staff');
                            setShowUserMenu(false);
                          }}
                          className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-100 rounded-md flex items-center gap-2"
                        >
                          <Building2 className="w-3.5 h-3.5 text-slate-500" />
                          Staff Operations Portal
                        </button>
                      )}
                      {currentUser.role === 'admin' && (
                        <button
                          onClick={() => {
                            onChangeView('admin');
                            setShowUserMenu(false);
                          }}
                          className="w-full text-left px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-100 rounded-md flex items-center gap-2"
                        >
                          <ShieldAlert className="w-3.5 h-3.5 text-slate-500" />
                          Administrator Console
                        </button>
                      )}
                    </div>

                    <div className="border-t border-slate-100 pt-1">
                      <button
                        onClick={() => {
                          onLogout();
                          setShowUserMenu(false);
                        }}
                        className="w-full text-left px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-md flex items-center gap-2 font-medium"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onOpenAuth('signin')}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Sign In
                </button>
                <button
                  onClick={() => onOpenAuth('register')}
                  className="px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors"
                >
                  Register
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
