import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { MessageCircle, Phone, Send, X, Headphones } from 'lucide-react';

export const SupportFloat: React.FC = () => {
  const { flashNotice, user } = useApp();
  const [isOpen, setIsOpen] = useState(false);

  const whatsappMsg = encodeURIComponent(
    `Hello STAR777 Support, My User ID: ${user.id} (${user.username}). I need assistance with my account/wallet.`
  );
  const whatsappUrl = `https://wa.me/${flashNotice.whatsappNumber}?text=${whatsappMsg}`;
  const telegramUrl = `https://t.me/${flashNotice.telegramUsername}`;

  return (
    <div className="fixed bottom-20 right-4 z-40 flex flex-col items-end">
      {/* Expanded Support Card */}
      {isOpen && (
        <div className="mb-2 w-72 bg-gradient-to-b from-[#0c1a33] to-[#071020] border border-amber-500/40 rounded-2xl shadow-2xl p-4 text-slate-100 animate-in zoom-in-95 duration-150 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-black text-amber-300 uppercase tracking-wider">
                24x7 Live Helpline
              </span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            Need help with Deposits, Withdrawals, or Bids? Chat directly with our operators:
          </p>

          <div className="space-y-2">
            {/* WhatsApp Button */}
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-95"
            >
              <MessageCircle className="w-4 h-4 fill-white" />
              <span>Chat on WhatsApp</span>
            </a>

            {/* Telegram Button */}
            <a
              href={telegramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 px-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all active:scale-95"
            >
              <Send className="w-4 h-4" />
              <span>Join Telegram Channel</span>
            </a>

            {/* Call Support */}
            <a
              href={`tel:${flashNotice.supportPhone}`}
              className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center gap-2 border border-slate-700 transition-colors"
            >
              <Phone className="w-3.5 h-3.5 text-amber-400" />
              <span>Call: {flashNotice.supportPhone}</span>
            </a>
          </div>
        </div>
      )}

      {/* Floating Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-13 h-13 rounded-full bg-gradient-to-tr from-emerald-500 via-emerald-400 to-green-300 text-slate-950 shadow-xl shadow-emerald-500/40 flex items-center justify-center hover:scale-110 active:scale-95 transition-all border-2 border-white/40"
        title="24x7 Help & WhatsApp Support"
      >
        <MessageCircle className="w-7 h-7 fill-slate-950 text-emerald-400" />
      </button>
    </div>
  );
};
