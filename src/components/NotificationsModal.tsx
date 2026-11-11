import React, { useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { X, Trophy, ArrowDownCircle, ArrowUpCircle, Bell, Info } from 'lucide-react';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({ isOpen, onClose }) => {
  const { notifications, markNotificationsAsRead } = useApp();

  useEffect(() => {
    if (isOpen) {
      markNotificationsAsRead();
    }
  }, [isOpen, markNotificationsAsRead]);

  if (!isOpen) return null;

  const getIcon = (type: string) => {
    switch (type) {
      case 'win':
        return <Trophy className="w-5 h-5 text-amber-400" />;
      case 'deposit':
        return <ArrowDownCircle className="w-5 h-5 text-emerald-400" />;
      case 'withdrawal':
        return <ArrowUpCircle className="w-5 h-5 text-sky-400" />;
      case 'bet':
        return <Bell className="w-5 h-5 text-purple-400" />;
      default:
        return <Info className="w-5 h-5 text-blue-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-gradient-to-b from-[#0c1a33] to-[#071020] border border-amber-500/30 rounded-2xl shadow-2xl p-4 text-slate-100 flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-amber-200">Activity Notifications</h3>
              <p className="text-xs text-slate-400">Live wins, deposits, and game alerts</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-3 space-y-2.5">
          {notifications.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-40 text-amber-400" />
              <p className="text-sm">No notifications yet</p>
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className={`p-3 rounded-xl border transition-all ${
                  n.type === 'win'
                    ? 'bg-amber-950/30 border-amber-500/40'
                    : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-slate-800/80 mt-0.5">{getIcon(n.type)}</div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs sm:text-sm font-bold text-amber-200">{n.title}</h4>
                    <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">{n.message}</p>
                    <span className="text-[10px] text-slate-500 block mt-1.5">
                      {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ·{' '}
                      {new Date(n.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="pt-2 border-t border-slate-800 text-center">
          <button
            onClick={onClose}
            className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 font-semibold rounded-xl text-xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
