import React from 'react';
import { LocationDef } from '../types/game';
import { LOCATIONS } from '../data/locationsData';
import { ALL_FISH } from '../data/fishData';
import { X, MapPin, Lock, Unlock, ArrowRight, Sparkles } from 'lucide-react';
import { sound } from '../utils/audio';

interface LocationsModalProps {
  currentLocationId: string;
  unlockedLocations: string[];
  coins: number;
  onSelectLocation: (locationId: string) => void;
  onUnlockLocation: (locationId: string, cost: number) => void;
  onClose: () => void;
}

export const LocationsModal: React.FC<LocationsModalProps> = ({
  currentLocationId,
  unlockedLocations,
  coins,
  onSelectLocation,
  onUnlockLocation,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md select-none text-white animate-fade-in">
      <div className="relative w-full max-w-3xl h-[85vh] flex flex-col rounded-3xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-600 to-emerald-400 flex items-center justify-center text-xl shadow-md">
              🗺️
            </div>
            <div>
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                <span>World Map & Fishing Expeditions</span>
              </h2>
              <p className="text-xs text-slate-400">
                Travel between peaceful freshwater ponds, crystal alpine lakes, and cosmic abyssal oceans.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Location List */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3">
          {LOCATIONS.map((loc, idx) => {
            const isUnlocked = unlockedLocations.includes(loc.id);
            const isCurrent = currentLocationId === loc.id;
            const canAfford = !isUnlocked && coins >= loc.unlockCost;
            const speciesInLoc = ALL_FISH.filter(f => f.locationId === loc.id);

            return (
              <div
                key={loc.id}
                className={`p-4 rounded-2xl border transition-all ${
                  isCurrent
                    ? 'bg-slate-800/90 border-emerald-500/80 shadow-lg shadow-emerald-950/50 ring-2 ring-emerald-500/30'
                    : isUnlocked
                    ? 'bg-slate-800/70 border-slate-700/80 hover:border-slate-500'
                    : 'bg-slate-950/60 border-slate-800/80'
                }`}
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  {/* Left: Location Banner & Title */}
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-inner border border-white/10 shrink-0"
                      style={{
                        background: `linear-gradient(135deg, ${loc.waterColors[0]}, ${loc.waterColors[2]})`,
                      }}
                    >
                      {idx === 0 ? '🌿' : idx === 1 ? '❄️' : idx === 2 ? '🪸' : idx === 3 ? '🏮' : '🪐'}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-black text-base text-white">
                          {loc.name}
                        </h3>
                        {isCurrent && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500 text-slate-950">
                            CURRENT
                          </span>
                        )}
                        <span className="text-[10px] font-bold text-slate-400 px-2 py-0.5 rounded bg-slate-800">
                          {loc.catchValueMultiplier}x Value Boost
                        </span>
                      </div>
                      <p className="text-xs text-slate-300/90 mt-0.5">
                        {loc.subtitle}
                      </p>
                      <p className="text-[11px] text-slate-400/80 mt-1 line-clamp-2 max-w-lg">
                        {loc.description}
                      </p>
                      <div className="text-[10px] text-emerald-400 font-semibold mt-1">
                        🐟 {speciesInLoc.length} Native Species
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="shrink-0 w-full sm:w-auto">
                    {isCurrent ? (
                      <div className="px-4 py-2 rounded-xl bg-slate-800/80 border border-emerald-600/50 text-emerald-300 font-bold text-xs text-center">
                        Active Pond
                      </div>
                    ) : isUnlocked ? (
                      <button
                        onClick={() => {
                          onSelectLocation(loc.id);
                          sound.playCast();
                          onClose();
                        }}
                        className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-md shadow-emerald-950 flex items-center justify-center gap-1.5 transition-transform active:scale-95 cursor-pointer"
                      >
                        <MapPin className="w-3.5 h-3.5" />
                        <span>Travel Here</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          if (canAfford) {
                            onUnlockLocation(loc.id, loc.unlockCost);
                            sound.playChest();
                          }
                        }}
                        disabled={!canAfford}
                        className={`w-full sm:w-auto px-4 py-2.5 rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                          canAfford
                            ? 'bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 text-amber-950 shadow-md shadow-amber-950 active:scale-95'
                            : 'bg-slate-800 text-slate-500 border border-slate-700/60 cursor-not-allowed'
                        }`}
                      >
                        <Lock className="w-3.5 h-3.5" />
                        <span>Unlock for 🪙 {loc.unlockCost.toLocaleString()}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
};
