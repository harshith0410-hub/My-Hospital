import React from 'react';
import { X, Bell, CheckCircle2, AlertTriangle, AlertCircle, Info, ExternalLink } from 'lucide-react';
import { InAppNotification } from '../lib/types.ts';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: InAppNotification[];
  onMarkRead: (id: string) => void;
  onNavigate: (url: string) => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkRead,
  onNavigate,
}) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="notif-center-title"
      className="fixed inset-0 z-50 flex items-start justify-end p-4 sm:p-6 bg-slate-900/40 backdrop-blur-xs animate-in fade-in"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-sm w-full max-h-[85vh] flex flex-col overflow-hidden animate-in slide-in-from-right-4">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-blue-600" />
            <h3 id="notif-center-title" className="text-sm font-bold text-slate-900">
              In-App Notification Center
            </h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Close notification center"
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* List */}
        <div className="overflow-y-auto flex-1 divide-y divide-slate-100 p-2">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No new alerts or notifications.
            </div>
          ) : (
            notifications.map((n) => {
              const icon = {
                success: <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />,
                warning: <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />,
                alert: <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />,
                info: <Info className="w-4 h-4 text-blue-600 shrink-0" />,
              }[n.type] || <Info className="w-4 h-4 text-blue-600 shrink-0" />;

              return (
                <div
                  key={n.id}
                  className={`p-3 rounded-xl transition-colors ${
                    n.read ? 'bg-white opacity-75' : 'bg-blue-50/40 border border-blue-100/50'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <div className="mt-0.5">{icon}</div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-bold text-slate-900">{n.title}</span>
                        {!n.read && (
                          <button
                            onClick={() => onMarkRead(n.id)}
                            className="text-[10px] text-blue-600 hover:underline font-semibold"
                          >
                            Mark read
                          </button>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">{n.message}</p>
                      <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-100 text-[10px] text-slate-400">
                        <span>{new Date(n.createdAt).toLocaleTimeString()}</span>
                        {n.linkUrl && (
                          <button
                            onClick={() => {
                              onNavigate(n.linkUrl!);
                              onClose();
                            }}
                            className="text-blue-700 font-bold flex items-center gap-1 hover:underline"
                          >
                            <span>Open Details</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
