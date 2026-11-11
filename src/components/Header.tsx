import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Crown,
  Wallet,
  PlusCircle,
  Bell,
  Menu,
  ShieldCheck,
  User,
  Volume2,
  VolumeX,
  Code2,
} from 'lucide-react';

interface HeaderProps {
  onOpenDrawer: () => void;
  onOpenNotifications: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenDrawer, onOpenNotifications }) => {
  const {
    user,
    currentRole,
    toggleRole,
    unreadNotificationCount,
    setActiveScreen,
    playSound,
  } = useApp();

  const [soundEnabled, setSoundEnabled] = useState(true);

  const handleSoundToggle = () => {
    setSoundEnabled(!soundEnabled);
    if (!soundEnabled) {
      playSound('coin');
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-gradient-to-r from-[#09152b] via-[#0d2042] to-[#09152b] border-b border-amber-500/20 shadow-xl px-3 sm:px-5 py-2.5">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-2">
        {/* Left: Drawer Toggle & Brand */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={onOpenDrawer}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-amber-400 border border-amber-500/30 transition-all active:scale-95 shadow-sm"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <button
            onClick={() => setActiveScreen('home')}
            className="flex items-center gap-2 text-left group"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 via-amber-500 to-amber-700 p-0.5 shadow-lg shadow-amber-500/20 group-hover:scale-105 transition-transform flex items-center justify-center">
              <div className="w-full h-full bg-[#0b172e] rounded-[10px] flex items-center justify-center">
                <Crown className="w-5 h-5 text-amber-400 fill-amber-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black tracking-wider text-base sm:text-lg bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-500 bg-clip-text text-transparent">
                  STAR777
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded font-black tracking-widest bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  PRO
                </span>
              </div>
              <p className="text-[10px] text-slate-400 hidden xs:block font-medium">Real Money & Matka</p>
            </div>
          </button>
        </div>

        {/* Center: Live Real Wallet Pill */}
        <div className="flex items-center">
          <button
            onClick={() => setActiveScreen('wallet')}
            className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-full bg-gradient-to-r from-slate-900/90 via-slate-800/90 to-slate-900/90 border border-amber-500/40 shadow-inner group hover:border-amber-400 transition-all"
            title="Wallet Balance - Click to Deposit"
          >
            <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400">
              <Wallet className="w-3.5 h-3.5" />
            </div>
            <div className="text-left">
              <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold leading-none">
                Points
              </div>
              <div className="text-xs sm:text-sm font-extrabold text-amber-300 leading-tight">
                ₹{user.walletBalance.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div className="pl-1 text-emerald-400 hover:text-emerald-300 transition-colors">
              <PlusCircle className="w-4 h-4 fill-emerald-500/20" />
            </div>
          </button>
        </div>

        {/* Right: Quick Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Railway Code Exporter Button */}
          <button
            onClick={() => setActiveScreen('code_guide')}
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-950/60 hover:bg-blue-900/70 text-blue-300 border border-blue-500/30 transition-all"
            title="Railway & GitHub Backend Code"
          >
            <Code2 className="w-3.5 h-3.5 text-blue-400" />
            <span>Railway Repo Code</span>
          </button>

          {/* Sound Toggle */}
          <button
            onClick={handleSoundToggle}
            className="p-2 rounded-xl text-slate-400 hover:text-amber-300 hover:bg-slate-800/60 transition-colors"
            title={soundEnabled ? 'Mute SFX' : 'Enable SFX'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
          </button>

          {/* Notifications Bell */}
          <button
            onClick={onOpenNotifications}
            className="relative p-2 rounded-xl text-slate-300 hover:text-amber-300 hover:bg-slate-800/60 transition-colors"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadNotificationCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
              </span>
            )}
          </button>

          {/* Role Switcher (User <-> Admin) */}
          <button
            onClick={toggleRole}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
              currentRole === 'admin'
                ? 'bg-gradient-to-r from-rose-600 to-amber-600 text-white border border-rose-400/50 shadow-rose-900/30'
                : 'bg-slate-800/90 text-amber-300 border border-amber-500/30 hover:bg-slate-700/90'
            }`}
            title="Toggle between Player and Admin Mode"
          >
            {currentRole === 'admin' ? (
              <>
                <ShieldCheck className="w-3.5 h-3.5 text-amber-200" />
                <span className="hidden sm:inline">Admin Mode</span>
                <span className="sm:hidden">Admin</span>
              </>
            ) : (
              <>
                <User className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Player</span>
              </>
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
