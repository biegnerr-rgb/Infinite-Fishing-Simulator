import React from 'react';
import { OfflineCatchResult } from '../utils/storage';
import { Sparkles, Moon, Coins, ShoppingBag, X } from 'lucide-react';
import { sound } from '../utils/audio';

interface OfflineProgressModalProps {
  result: OfflineCatchResult;
  onClaim: () => void;
}

export const OfflineProgressModal: React.FC<OfflineProgressModalProps> = ({
  result,
  onClaim,
}) => {
  const hours = Math.floor(result.elapsedSeconds / 3600);
  const minutes = Math.floor((result.elapsedSeconds % 3600) / 60);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md select-none text-white animate-fade-in">
      <div className="relative w-full max-w-md rounded-3xl p-6 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-2 border-indigo-500/50 shadow-2xl text-center">
        
        {/* Moon Icon */}
        <div className="w-14 h-14 rounded-3xl bg-indigo-500/20 border border-indigo-400/40 text-indigo-300 flex items-center justify-center text-3xl mx-auto mb-3 shadow-lg">
          🌙
        </div>

        <h2 className="text-2xl font-black text-white tracking-tight mb-1">
          Welcome Back, Angler!
        </h2>
        <p className="text-xs text-indigo-300 font-medium mb-4">
          While you were away for{' '}
          <span className="font-bold text-white">
            {hours > 0 ? `${hours}h ${minutes}m` : `${minutes} minutes`}
          </span>
          , your automated lines kept on fishing!
        </p>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-4 text-left">
          <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700/80">
            <span className="text-[11px] font-bold text-slate-400 block uppercase">
              Total Catches
            </span>
            <span className="text-lg font-black text-emerald-400 font-mono">
              🎣 {result.totalCatches} Fish
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-800/80 border border-slate-700/80">
            <span className="text-[11px] font-bold text-slate-400 block uppercase">
              Earnings
            </span>
            <span className="text-lg font-black text-amber-300 font-mono">
              🪙 {result.coinsEarned.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Highlight catch */}
        {result.topFishName && (
          <div className="p-3 rounded-2xl bg-indigo-950/50 border border-indigo-800/60 mb-5 text-xs text-indigo-200">
            <span className="text-indigo-400 font-bold block text-[10px] uppercase">
              Notable Deep Catch:
            </span>
            <span className="font-extrabold text-white text-sm">
              ✨ {result.topFishVariant !== 'Standard' ? `${result.topFishVariant} ` : ''}
              {result.topFishName}
            </span>
          </div>
        )}

        <button
          onClick={() => {
            onClaim();
            sound.playCoin();
          }}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-emerald-950 font-black text-sm tracking-wide shadow-xl shadow-emerald-950 flex items-center justify-center gap-2 transition-transform active:scale-95 cursor-pointer"
        >
          <Sparkles className="w-4 h-4" />
          <span>Collect All Rewards & Fish!</span>
        </button>
      </div>
    </div>
  );
};
