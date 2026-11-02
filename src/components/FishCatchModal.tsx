import React, { useEffect } from 'react';
import { CaughtFish, FishSpecies } from '../types/game';
import { FISH_VARIANTS, RARITY_CONFIG } from '../data/fishData';
import { FishRenderer } from './FishRenderer';
import { Sparkles, Trophy, CheckCircle, Coins, ArrowRight, X } from 'lucide-react';

interface FishCatchModalProps {
  catchData: {
    fish: CaughtFish;
    species: FishSpecies;
    isNewSpecies: boolean;
    isNewRecord: boolean;
  };
  onClose: () => void;
  onQuickSell: () => void;
  onFastModeToggle: (enabled: boolean) => void;
  fastMode: boolean;
}

export const FishCatchModal: React.FC<FishCatchModalProps> = ({
  catchData,
  onClose,
  onQuickSell,
  onFastModeToggle,
  fastMode,
}) => {
  const { fish, species, isNewSpecies, isNewRecord } = catchData;
  const rarityInfo = RARITY_CONFIG[species.rarity];
  const variantInfo = FISH_VARIANTS[fish.variant];
  const isApexTitan = fish.size >= 300 || (species.minRodLevel && species.minRodLevel >= 4);

  // Pressing Enter or Space to quickly dismiss and continue fishing
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter' || e.code === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in select-none cursor-pointer"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md rounded-3xl p-6 bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-2 shadow-2xl text-center text-white overflow-hidden cursor-default"
        style={{
          borderColor: fish.variant !== 'Standard' ? variantInfo.color : rarityInfo.color,
          boxShadow: `0 0 35px ${fish.variant !== 'Standard' ? variantInfo.color + '45' : rarityInfo.color + '35'}`,
        }}
      >
        {/* Top Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Status Pills */}
        <div className="flex items-center justify-center gap-1.5 flex-wrap mb-2">
          {/* Automatic basket placement notification */}
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span>Stored in Basket</span>
          </span>

          {isApexTitan && (
            <span className="px-2.5 py-1 rounded-full text-xs font-black bg-rose-500/25 text-rose-300 border border-rose-500/60 flex items-center gap-1 animate-pulse">
              🌊 APEX TITAN!
            </span>
          )}

          {isNewSpecies && (
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/50 flex items-center gap-1 animate-bounce">
              <Sparkles className="w-3.5 h-3.5" /> NEW!
            </span>
          )}
          {isNewRecord && (
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-sky-500/20 text-sky-300 border border-sky-500/50 flex items-center gap-1">
              <Trophy className="w-3.5 h-3.5" /> RECORD!
            </span>
          )}
        </div>

        {/* Catch Title */}
        <h2 className="text-xl font-black tracking-tight text-white mb-0.5">
          Catch Revealed!
        </h2>
        <p className="text-xs text-slate-400 italic mb-3">
          {species.scientificName}
        </p>

        {/* Animated Fish Centerpiece */}
        <div className="py-2 flex items-center justify-center relative min-h-[130px]">
          <div 
            className="absolute inset-0 rounded-full blur-2xl opacity-20 pointer-events-none"
            style={{ backgroundColor: rarityInfo.color }}
          />
          <FishRenderer
            species={species}
            variant={fish.variant}
            size={180}
            animate={true}
          />
        </div>

        {/* Species Name & Variant */}
        <div className="space-y-1 my-2">
          <div className="text-2xl font-black tracking-wide text-white">
            {species.name}
          </div>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <span 
              className={`px-3 py-0.5 rounded-full text-xs font-bold border ${rarityInfo.bgBadge}`}
            >
              {species.rarity}
            </span>

            {fish.variant !== 'Standard' && (
              <span
                className="px-3 py-0.5 rounded-full text-xs font-extrabold border shadow-sm"
                style={{
                  backgroundColor: `${variantInfo.color}20`,
                  color: variantInfo.color,
                  borderColor: `${variantInfo.color}60`,
                }}
              >
                ✨ {fish.variant} Variant ({variantInfo.multiplier}x)
              </span>
            )}
          </div>
        </div>

        {/* Size & Value Stats Box */}
        <div className="grid grid-cols-2 gap-3 my-3 p-3 rounded-2xl bg-slate-800/60 border border-slate-700/60 text-sm">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">
              Length
            </span>
            <span className="text-base font-extrabold text-slate-100 font-mono">
              {fish.size} cm
            </span>
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-400 block uppercase tracking-wider">
              Market Value
            </span>
            <span className="text-base font-extrabold text-amber-300 font-mono flex items-center justify-center gap-1">
              <span>🪙</span> {fish.value.toLocaleString()}
            </span>
          </div>
        </div>

        <p className="text-xs text-slate-300/80 px-2 line-clamp-2 mb-4">
          "{species.description}"
        </p>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <button
            onClick={onClose}
            className="py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-emerald-950 font-black text-sm tracking-wide shadow-lg shadow-emerald-950/60 flex items-center justify-center gap-2 transition-transform active:scale-95 cursor-pointer"
          >
            <span>Continue Fishing</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={onQuickSell}
            className="py-3 px-4 rounded-2xl bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/50 text-amber-300 font-extrabold text-sm tracking-wide shadow-md flex items-center justify-center gap-2 transition-transform active:scale-95 cursor-pointer"
            title="Remove from basket and sell right now for coins"
          >
            <Coins className="w-4 h-4 text-amber-400" />
            <span>Sell Now (+{fish.value.toLocaleString()})</span>
          </button>
        </div>

        {/* Fast Catch toggle shortcut */}
        <label className="inline-flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none hover:text-slate-200">
          <input
            type="checkbox"
            checked={fastMode}
            onChange={(e) => onFastModeToggle(e.target.checked)}
            className="rounded border-slate-700 bg-slate-800 text-emerald-500 focus:ring-0"
          />
          <span>Fast Mode (auto-dismiss catch popups)</span>
        </label>
      </div>
    </div>
  );
};
