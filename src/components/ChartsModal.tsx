import React, { useState } from 'react';
import { Market } from '../types';
import { X, BarChart2, Calendar } from 'lucide-react';

interface ChartsModalProps {
  market: Market | null;
  onClose: () => void;
}

export const ChartsModal: React.FC<ChartsModalProps> = ({ market, onClose }) => {
  const [chartType, setChartType] = useState<'panel' | 'jodi'>('panel');

  if (!market) return null;

  // Sample realistic past historical week rows for chart display
  const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const HISTORICAL_WEEKS = [
    {
      week: 'Week 1',
      records: [
        { open: '137', jodi: '14', close: '248' },
        { open: '235', jodi: '04', close: '158' },
        { open: '378', jodi: '80', close: '479' },
        { open: '147', jodi: '29', close: '568' },
        { open: '257', jodi: '47', close: '368' },
        { open: '489', jodi: '13', close: '157' },
        { open: '***', jodi: '**', close: '***' },
      ],
    },
    {
      week: 'Week 2',
      records: [
        { open: '128', jodi: '15', close: '249' },
        { open: '348', jodi: '56', close: '178' },
        { open: '679', jodi: '23', close: '580' },
        { open: '139', jodi: '38', close: '260' },
        { open: '148', jodi: '39', close: '135' },
        { open: '258', jodi: '50', close: '479' },
        { open: '***', jodi: '**', close: '***' },
      ],
    },
    {
      week: 'Current Week',
      records: [
        { open: '248', jodi: '48', close: '369' },
        { open: '139', jodi: '32', close: '589' },
        { open: '357', jodi: '51', close: '236' },
        { open: market.open_pana || '137', jodi: (market.open_ank || '1') + (market.close_ank || '4'), close: market.close_pana || '248' },
        { open: '***', jodi: '**', close: '***' },
        { open: '***', jodi: '**', close: '***' },
        { open: '***', jodi: '**', close: '***' },
      ],
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-gradient-to-b from-[#0c1a33] to-[#071020] border border-amber-500/40 rounded-2xl shadow-2xl p-4 sm:p-5 text-slate-100 space-y-4 max-h-[90vh] flex flex-col animate-in zoom-in-95">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
              <BarChart2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base text-amber-300 uppercase">
                {market.name} Results Chart
              </h3>
              <p className="text-xs text-slate-400">Historical records & panel trends</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Chart Selector Switch */}
        <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800 self-start">
          <button
            onClick={() => setChartType('panel')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              chartType === 'panel'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Panel Chart (Open + Jodi + Close)
          </button>
          <button
            onClick={() => setChartType('jodi')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              chartType === 'jodi'
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Jodi Chart (2-Digit Only)
          </button>
        </div>

        {/* Chart Grid */}
        <div className="flex-1 overflow-x-auto overflow-y-auto">
          <table className="w-full text-center text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900 border border-slate-800 text-[11px] font-bold text-amber-300">
                <th className="p-2 border border-slate-800">Date Range</th>
                {DAYS.map((d) => (
                  <th key={d} className="p-2 border border-slate-800">
                    {d}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {HISTORICAL_WEEKS.map((w, i) => (
                <tr key={i} className="border border-slate-800 hover:bg-slate-900/40">
                  <td className="p-2 border border-slate-800 font-bold text-slate-400 whitespace-nowrap">
                    {w.week}
                  </td>
                  {w.records.map((r, dIdx) => (
                    <td key={dIdx} className="p-2 border border-slate-800 font-mono text-[11px]">
                      {chartType === 'panel' ? (
                        <div className="space-y-0.5">
                          <span className="text-slate-400 text-[10px] block">{r.open}</span>
                          <span className="font-bold text-amber-300 block text-xs">{r.jodi}</span>
                          <span className="text-slate-400 text-[10px] block">{r.close}</span>
                        </div>
                      ) : (
                        <span className="font-black text-amber-300 text-sm">{r.jodi}</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs rounded-xl transition-colors"
        >
          Close Chart
        </button>
      </div>
    </div>
  );
};
