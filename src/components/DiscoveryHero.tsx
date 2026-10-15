import React, { useState } from 'react';
import {
  Search,
  MapPin,
  Activity,
  AlertTriangle,
  LocateFixed,
  Filter,
  Layers,
  List,
  Map as MapIcon,
  X,
} from 'lucide-react';
import { Specialty } from '../lib/types.ts';

interface DiscoveryHeroProps {
  searchQuery: string;
  onSearchChange: (val: string) => void;
  selectedSpecialty: string;
  onSpecialtyChange: (val: string) => void;
  specialties: Specialty[];
  emergencyOnly: boolean;
  onEmergencyOnlyChange: (val: boolean) => void;
  icuOnly: boolean;
  onIcuOnlyChange: (val: boolean) => void;
  userCoords: { lat: number; lng: number } | null;
  onUseMyLocation: () => void;
  locationError: string | null;
  onClearLocationError: () => void;
  viewMode: 'split' | 'list' | 'map';
  onViewModeChange: (mode: 'split' | 'list' | 'map') => void;
  totalResultsCount: number;
}

export const DiscoveryHero: React.FC<DiscoveryHeroProps> = ({
  searchQuery,
  onSearchChange,
  selectedSpecialty,
  onSpecialtyChange,
  specialties,
  emergencyOnly,
  onEmergencyOnlyChange,
  icuOnly,
  onIcuOnlyChange,
  userCoords,
  onUseMyLocation,
  locationError,
  onClearLocationError,
  viewMode,
  onViewModeChange,
  totalResultsCount,
}) => {
  const [isLocating, setIsLocating] = useState(false);

  function handleLocationClick() {
    setIsLocating(true);
    onUseMyLocation();
    setTimeout(() => setIsLocating(false), 1200);
  }

  return (
    <div className="bg-gradient-to-b from-blue-900 via-slate-900 to-slate-950 text-white pt-8 pb-10 px-4 sm:px-6 lg:px-8 border-b border-slate-800">
      <div className="max-w-7xl mx-auto">
        {/* Urgent Emergency Warning Banner */}
        <div className="mb-6 p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-200 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>Life-Threatening Emergency Notice:</strong> If you or someone with you requires immediate resuscitation or acute emergency care, call 911 or your local emergency dispatch immediately. Do not delay travel for digital confirmation.
            </span>
          </div>
        </div>

        {/* Hero Headline */}
        <div className="text-center max-w-3xl mx-auto mb-8">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 border border-blue-400/20 text-blue-300 mb-3">
            <Activity className="w-3.5 h-3.5 text-teal-400" />
            Transparent Hospital Capacity & Care Coordination
          </span>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white mb-3">
            Find the Right Hospital, Faster.
          </h1>
          <p className="text-slate-300 text-sm sm:text-base max-w-2xl mx-auto">
            “Find the Right Care. At the Right Time.” Inspect verified bed capacity, duty specialists, and emergency availability before you arrive.
          </p>
        </div>

        {/* Filter & Search Bar Card */}
        <div className="bg-white/95 backdrop-blur-md rounded-2xl p-4 sm:p-5 shadow-2xl border border-white/20 text-slate-800 max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mb-3">
            {/* Search Input */}
            <div className="md:col-span-5 relative">
              <label htmlFor="search-input" className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Hospital or Locality
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  id="search-input"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder="e.g. Metro Health, Mission Bay, San Francisco..."
                  className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:bg-white focus:outline-hidden transition-all text-slate-900"
                />
                {searchQuery && (
                  <button
                    onClick={() => onSearchChange('')}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                    aria-label="Clear search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Specialty Dropdown */}
            <div className="md:col-span-4 relative">
              <label htmlFor="specialty-select" className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Specialty / Department
              </label>
              <select
                id="specialty-select"
                value={selectedSpecialty}
                onChange={(e) => onSpecialtyChange(e.target.value)}
                className="w-full py-2 px-3 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:bg-white focus:outline-hidden transition-all text-slate-900"
              >
                <option value="">All Medical Specialties (25 Available)</option>
                {specialties.map((spec) => (
                  <option key={spec.id} value={spec.name}>
                    {spec.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Location Button */}
            <div className="md:col-span-3 flex flex-col justify-end">
              <button
                type="button"
                onClick={handleLocationClick}
                disabled={isLocating}
                className={`w-full py-2 px-3 text-xs sm:text-sm font-semibold rounded-xl border flex items-center justify-center gap-2 transition-all ${
                  userCoords
                    ? 'bg-teal-50 border-teal-300 text-teal-800 hover:bg-teal-100'
                    : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
                }`}
                title="Use GPS to calculate exact distance to each facility"
              >
                <LocateFixed className={`w-4 h-4 ${isLocating ? 'animate-spin text-blue-600' : userCoords ? 'text-teal-600' : 'text-slate-500'}`} />
                <span>{userCoords ? 'GPS Active (SF)' : 'Use My Location'}</span>
              </button>
            </div>
          </div>

          {/* Location Error Warning if permission was denied */}
          {locationError && (
            <div className="mb-3 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-amber-600 shrink-0" />
                <span>{locationError} (Using center coordinates for distance calculation)</span>
              </div>
              <button
                onClick={onClearLocationError}
                className="text-amber-700 hover:text-amber-900 font-bold p-1"
                aria-label="Dismiss location warning"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Quick Filter Toggles & View Mode Switcher */}
          <div className="pt-3 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" /> Filters:
              </span>

              <button
                type="button"
                onClick={() => onEmergencyOnlyChange(!emergencyOnly)}
                className={`px-3 py-1.5 rounded-lg font-semibold border transition-all flex items-center gap-1.5 ${
                  emergencyOnly
                    ? 'bg-rose-50 border-rose-300 text-rose-700 ring-2 ring-rose-200'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${emergencyOnly ? 'bg-rose-500' : 'bg-slate-300'}`} />
                Accepting Emergencies
              </button>

              <button
                type="button"
                onClick={() => onIcuOnlyChange(!icuOnly)}
                className={`px-3 py-1.5 rounded-lg font-semibold border transition-all flex items-center gap-1.5 ${
                  icuOnly
                    ? 'bg-blue-50 border-blue-300 text-blue-700 ring-2 ring-blue-200'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${icuOnly ? 'bg-blue-500' : 'bg-slate-300'}`} />
                Available ICU Beds
              </button>

              {(searchQuery || selectedSpecialty || emergencyOnly || icuOnly) && (
                <button
                  type="button"
                  onClick={() => {
                    onSearchChange('');
                    onSpecialtyChange('');
                    onEmergencyOnlyChange(false);
                    onIcuOnlyChange(false);
                  }}
                  className="text-slate-500 hover:text-slate-800 underline text-xs"
                >
                  Reset all filters
                </button>
              )}
            </div>

            {/* View Mode Switcher */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => onViewModeChange('split')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
                  viewMode === 'split' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Split View</span>
              </button>
              <button
                type="button"
                onClick={() => onViewModeChange('list')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
                  viewMode === 'list' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">List Only</span>
              </button>
              <button
                type="button"
                onClick={() => onViewModeChange('map')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors ${
                  viewMode === 'map' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <MapIcon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Map Only</span>
              </button>
            </div>
          </div>
        </div>

        {/* Results summary bar */}
        <div className="mt-4 flex items-center justify-between text-xs text-slate-300 max-w-5xl mx-auto px-1">
          <span>
            Showing <strong className="text-white">{totalResultsCount}</strong> healthcare facilities matching criteria
          </span>
          <span className="text-teal-300 font-medium hidden sm:inline">
            ● Live capacity reported by hospital clinical coordinators
          </span>
        </div>
      </div>
    </div>
  );
};
