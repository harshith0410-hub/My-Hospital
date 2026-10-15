import React from 'react';
import { Activity, Building2, ChevronRight, Stethoscope } from 'lucide-react';
import { Specialty, Hospital } from '../lib/types.ts';

interface SpecialtiesViewProps {
  specialties: Specialty[];
  hospitals: Hospital[];
  onSelectSpecialty: (specialtyName: string) => void;
}

export const SpecialtiesView: React.FC<SpecialtiesViewProps> = ({
  specialties,
  hospitals,
  onSelectSpecialty,
}) => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="text-center max-w-2xl mx-auto mb-8">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 mb-2">
          <Activity className="w-3.5 h-3.5 text-blue-600" />
          Clinical Specialty Directory
        </span>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          Find Care by Clinical Specialty
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-2">
          Browse verified hospital departments and duty specialists across all 25 catalogued medical disciplines.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {specialties.map((spec) => {
          // Count hospitals providing this specialty
          const matchingHospitals = hospitals.filter((h) =>
            h.departments?.some((d) => d.isActive && (d.specialtyId === spec.id || d.specialtyName.toLowerCase().includes(spec.name.toLowerCase())))
          );

          return (
            <div
              key={spec.id}
              onClick={() => onSelectSpecialty(spec.name)}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-blue-400 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Stethoscope className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-bold text-slate-500 group-hover:text-blue-700 transition-colors flex items-center gap-1">
                    <span>{matchingHospitals.length} Facilities</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                  {spec.name}
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  {spec.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-xs text-slate-600">
                <Building2 className="w-3.5 h-3.5 text-blue-600" />
                <span className="truncate">
                  {matchingHospitals.length > 0
                    ? `Available at ${matchingHospitals.map((h) => h.name.split(' ')[0]).join(', ')}`
                    : 'Currently coordinating coverage'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
