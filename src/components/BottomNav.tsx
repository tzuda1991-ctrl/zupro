import React from 'react';
import { useApp } from '../context/AppContext';
import {
  TrendingUp,
  History,
  Wallet,
  FileText,
  ShieldCheck,
} from 'lucide-react';

export const BottomNav: React.FC = () => {
  const {
    activeScreen,
    setActiveScreen,
    paymentRequests,
    withdrawalRequests,
  } = useApp();

  const pendingCount =
    paymentRequests.filter((p) => p.status === 'pending').length +
    withdrawalRequests.filter((w) => w.status === 'pending').length;

  const items = [
    {
      id: 'home' as const,
      label: 'Markets',
      icon: TrendingUp,
    },
    {
      id: 'history' as const,
      label: 'My Bids',
      icon: History,
    },
    {
      id: 'wallet' as const,
      label: 'Add Cash',
      icon: Wallet,
      highlight: true,
    },
    {
      id: 'passbook' as const,
      label: 'Passbook',
      icon: FileText,
    },
    {
      id: 'admin' as const,
      label: 'Admin',
      icon: ShieldCheck,
      badge: pendingCount > 0 ? pendingCount : undefined,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#09152b]/95 backdrop-blur-md border-t border-amber-500/20 px-2 py-1.5 shadow-[0_-4px_20px_rgba(0,0,0,0.5)]">
      <div className="max-w-md mx-auto grid grid-cols-5 gap-1">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeScreen === item.id;

          if (item.highlight) {
            return (
              <button
                key={item.id}
                onClick={() => setActiveScreen(item.id)}
                className="relative flex flex-col items-center justify-center -top-3 group transition-transform active:scale-95"
              >
                <div className={`w-12 h-12 rounded-full p-0.5 shadow-lg flex items-center justify-center transition-all ${
                  isActive
                    ? 'bg-gradient-to-tr from-amber-400 via-amber-300 to-yellow-200 shadow-amber-500/50 scale-105'
                    : 'bg-gradient-to-tr from-amber-500 to-amber-600 shadow-amber-500/30 group-hover:scale-105'
                }`}>
                  <div className="w-full h-full bg-[#0a172e] rounded-full flex items-center justify-center">
                    <Icon className="w-6 h-6 text-amber-400 fill-amber-400/20" />
                  </div>
                </div>
                <span className={`text-[10px] font-bold mt-1 tracking-tight ${
                  isActive ? 'text-amber-300' : 'text-slate-300'
                }`}>
                  {item.label}
                </span>
              </button>
            );
          }

          return (
            <button
              key={item.id}
              onClick={() => setActiveScreen(item.id)}
              className={`relative flex flex-col items-center justify-center py-1 rounded-xl transition-all ${
                isActive
                  ? 'text-amber-300'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : ''}`} />
                {item.badge !== undefined && (
                  <span className="absolute -top-1 -right-2 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center animate-pulse">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] font-semibold mt-0.5 ${isActive ? 'font-bold' : ''}`}>
                {item.label}
              </span>
              {isActive && (
                <span className="absolute bottom-0 w-6 h-0.5 bg-amber-400 rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
