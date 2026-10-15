import React, { useState, useEffect, useRef } from 'react';
import {
  MapPin,
  Navigation,
  Plus,
  Minus,
  RotateCcw,
  ShieldCheck,
  AlertTriangle,
  Bed,
  Phone,
  ExternalLink,
  Layers,
  Compass,
} from 'lucide-react';
import { Hospital } from '../lib/types.ts';

interface HospitalMapProps {
  hospitals: Hospital[];
  selectedHospitalId: string | null;
  onSelectHospital: (id: string) => void;
  onOpenDetails: (hospital: Hospital) => void;
  userCoords: { lat: number; lng: number } | null;
}

export const HospitalMap: React.FC<HospitalMapProps> = ({
  hospitals,
  selectedHospitalId,
  onSelectHospital,
  onOpenDetails,
  userCoords,
}) => {
  const apiKey = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY;
  const [googleMapsLoaded, setGoogleMapsLoaded] = useState(false);
  const [googleMapsError, setGoogleMapsError] = useState<string | null>(null);

  // Fallback interactive GIS state
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Map center: San Francisco Bay Area (default coordinates 37.7749, -122.4194)
  const centerLat = userCoords?.lat || 37.7749;
  const centerLng = userCoords?.lng || -122.4194;

  // Selected hospital object
  const selectedHospital = hospitals.find((h) => h.id === selectedHospitalId);

  // Attempt loading Google Maps if API key exists
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const googleMapInstance = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  useEffect(() => {
    if (!apiKey) return;

    if ((window as any).google && (window as any).google.maps) {
      setGoogleMapsLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => setGoogleMapsLoaded(true);
    script.onerror = () => setGoogleMapsError('Google Maps API failed to load with provided key');
    document.head.appendChild(script);

    return () => {
      // Clean up script if unmounted before load
    };
  }, [apiKey]);

  // If Google Maps is loaded, initialize Google Maps instance
  useEffect(() => {
    if (!googleMapsLoaded || !mapContainerRef.current || !(window as any).google?.maps) return;

    const maps = (window as any).google.maps;
    if (!googleMapInstance.current) {
      googleMapInstance.current = new maps.Map(mapContainerRef.current, {
        center: { lat: centerLat, lng: centerLng },
        zoom: 13,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
      });
    }

    // Clear old markers
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    // Add markers
    hospitals.forEach((hospital) => {
      const marker = new maps.Marker({
        position: { lat: hospital.latitude, lng: hospital.longitude },
        map: googleMapInstance.current,
        title: hospital.name,
      });

      marker.addListener('click', () => {
        onSelectHospital(hospital.id);
      });

      markersRef.current.push(marker);
    });
  }, [googleMapsLoaded, hospitals, centerLat, centerLng, onSelectHospital]);

  // SVG GIS coordinate projection mapping:
  // Maps lat/lng from San Francisco box: lat ~ 37.74 to 37.82, lng ~ -122.45 to -122.37
  function projectToSvg(lat: number, lng: number) {
    const minLat = 37.74;
    const maxLat = 37.81;
    const minLng = -122.46;
    const maxLng = -122.37;

    const xPercent = ((lng - minLng) / (maxLng - minLng)) * 100;
    // Invert Y because latitude goes north (up) but SVG Y goes down
    const yPercent = (1 - (lat - minLat) / (maxLat - minLat)) * 100;

    return { x: xPercent, y: yPercent };
  }

  // Pan handlers for GIS fallback map
  function handleMouseDown(e: React.MouseEvent) {
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX - panOffset.x, y: e.clientY - panOffset.y };
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!isDragging) return;
    setPanOffset({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    });
  }

  function handleMouseUp() {
    setIsDragging(false);
  }

  return (
    <div className="relative w-full h-[520px] lg:h-[680px] bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 shadow-xl flex flex-col">
      {/* Top Banner: Key configuration status */}
      <div className="absolute top-3 left-3 right-3 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        <div className="pointer-events-auto bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700 text-xs text-slate-200 flex items-center gap-2 shadow-lg">
          <Layers className="w-3.5 h-3.5 text-blue-400" />
          <span className="font-semibold text-white">GIS Healthcare Coverage Grid</span>
          <span className="text-slate-400">|</span>
          <span className="text-[11px] text-teal-400">
            {apiKey && googleMapsLoaded ? 'Google Maps JavaScript API Active' : 'Demonstration GIS Map Mode'}
          </span>
        </div>

        {/* Controls: Zoom & Reset */}
        <div className="pointer-events-auto flex items-center gap-1 bg-slate-900/90 backdrop-blur-md p-1 rounded-xl border border-slate-700 shadow-lg">
          <button
            onClick={() => setZoomLevel((z) => Math.min(2.2, z + 0.25))}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            title="Zoom in"
            aria-label="Zoom in"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoomLevel((z) => Math.max(0.75, z - 0.25))}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            title="Zoom out"
            aria-label="Zoom out"
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setZoomLevel(1);
              setPanOffset({ x: 0, y: 0 });
            }}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
            title="Reset map view"
            aria-label="Reset map view"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Google Maps Canvas container or Interactive SVG Vector GIS fallback */}
      {apiKey && googleMapsLoaded ? (
        <div ref={mapContainerRef} className="w-full h-full" />
      ) : (
        <div
          className={`relative w-full h-full bg-[#0b1329] select-none overflow-hidden cursor-${isDragging ? 'grabbing' : 'grab'}`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Subtle Grid and Topography lines */}
          <div
            className="absolute inset-0 transition-transform duration-75"
            style={{
              transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
              transformOrigin: 'center center',
            }}
          >
            <svg className="w-full h-full" viewBox="0 0 800 600" preserveAspectRatio="none">
              <defs>
                <pattern id="gis-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1e293b" strokeWidth="0.75" />
                </pattern>
                <radialGradient id="waterGradient" cx="70%" cy="30%" r="60%">
                  <stop offset="0%" stopColor="#0f172a" />
                  <stop offset="100%" stopColor="#080e1e" />
                </radialGradient>
              </defs>

              <rect width="100%" height="100%" fill="url(#gis-grid)" />

              {/* Fictional Bay Area Shoreline contour for spatial realism */}
              <path
                d="M 50,0 Q 200,120 300,200 T 450,340 T 600,480 L 800,600 L 800,0 Z"
                fill="#0e1726"
                stroke="#334155"
                strokeWidth="1.5"
                opacity="0.6"
              />
              <path
                d="M 520,40 Q 640,120 720,240 T 800,400 L 800,0 Z"
                fill="#131c31"
                stroke="#334155"
                strokeWidth="1.5"
                opacity="0.8"
              />

              {/* Major Highway / Transit arterials */}
              <path
                d="M 0,280 Q 280,260 480,300 T 800,320"
                fill="none"
                stroke="#1e3a5f"
                strokeWidth="3"
                strokeDasharray="6,4"
              />
              <path
                d="M 320,0 Q 360,280 420,600"
                fill="none"
                stroke="#1e3a5f"
                strokeWidth="2.5"
              />

              {/* User Location Radar beacon if coordinates present */}
              {userCoords && (
                <g transform="translate(380, 290)">
                  <circle r="40" fill="rgba(20, 184, 166, 0.15)" className="animate-ping" />
                  <circle r="18" fill="rgba(20, 184, 166, 0.3)" />
                  <circle r="6" fill="#14b8a6" stroke="#ffffff" strokeWidth="2" />
                  <text x="12" y="4" fill="#5eead4" fontSize="11" fontWeight="bold">
                    You (GPS Active)
                  </text>
                </g>
              )}
            </svg>

            {/* Hospital Markers positioned with coordinate projection */}
            {hospitals.map((hospital, index) => {
              const coords = projectToSvg(hospital.latitude, hospital.longitude);
              const isSelected = hospital.id === selectedHospitalId;
              const isAccepting = hospital.emergencyStatus === 'accepting';
              const availableBeds = hospital.bedCategories?.reduce((acc, b) => acc + b.availableBeds, 0) || 0;

              // Marker offset coordinates mapped to 800x600 viewBox
              const leftPx = (coords.x / 100) * 800;
              const topPx = (coords.y / 100) * 600;

              return (
                <div
                  key={hospital.id}
                  style={{
                    position: 'absolute',
                    left: `${leftPx}px`,
                    top: `${topPx}px`,
                    transform: 'translate(-50%, -100%)',
                  }}
                  className="group z-10"
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectHospital(hospital.id);
                    }}
                    className={`relative p-1.5 rounded-full shadow-2xl transition-all duration-300 focus:outline-hidden ${
                      isSelected
                        ? 'bg-blue-600 ring-4 ring-blue-400/50 scale-125 z-30'
                        : isAccepting
                        ? 'bg-emerald-600 hover:scale-115'
                        : 'bg-amber-600 hover:scale-115'
                    }`}
                    aria-label={`Select ${hospital.name}`}
                  >
                    <MapPin className="w-5 h-5 text-white" />
                    {/* Pulsing beacon for accepting emergency */}
                    {isAccepting && (
                      <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
                    )}
                  </button>

                  {/* Marker Label */}
                  <div
                    className={`mt-1 px-2 py-0.5 rounded-md text-[10px] font-bold whitespace-nowrap shadow-md border ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-400'
                        : 'bg-slate-900/90 text-slate-200 border-slate-700'
                    }`}
                  >
                    {hospital.name.split(' ')[0]} ({availableBeds} beds)
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Selected Hospital Overlay Card (Bottom Drawer) */}
      {selectedHospital && (
        <div className="absolute bottom-3 left-3 right-3 z-30 bg-slate-900/95 backdrop-blur-md rounded-xl p-4 border border-slate-700 text-white shadow-2xl animate-in slide-in-from-bottom-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold text-teal-400 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-teal-400" />
                Selected Facility
              </span>
              {selectedHospital.verificationStatus === 'verified' && (
                <span className="px-1.5 py-0.2 rounded text-[10px] bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  Verified
                </span>
              )}
            </div>
            <h4 className="text-sm sm:text-base font-bold text-white truncate">
              {selectedHospital.name}
            </h4>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 mt-1">
              <span>{selectedHospital.address}, {selectedHospital.locality}</span>
              <span className="text-slate-500">•</span>
              <span className="font-semibold text-emerald-400">
                {selectedHospital.bedCategories?.reduce((acc, b) => acc + b.availableBeds, 0) || 0} Available Beds
              </span>
              <span className="text-slate-500">•</span>
              <span className="text-rose-300 font-medium">ER: {selectedHospital.emergencyPhone}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
            <button
              onClick={() => onOpenDetails(selectedHospital)}
              className="flex-1 sm:flex-none px-3.5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <span>Inspect Profile & Roster</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Honest fallback note at bottom left */}
      <div className="absolute bottom-2 left-3 z-10 pointer-events-none text-[10px] text-slate-400 bg-slate-950/80 px-2 py-0.5 rounded-md hidden sm:block">
        {!apiKey
          ? 'Google Maps key unconfigured: Displaying synchronized interactive GIS vector map.'
          : 'Google Maps Platform Connected.'}
      </div>
    </div>
  );
};
