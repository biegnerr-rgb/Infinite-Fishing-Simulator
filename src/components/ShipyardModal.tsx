import React from 'react';
import { BOAT_TIERS } from '../data/storyData';
import { BoatTierDef } from '../types/story';
import { X, CheckCircle2, Anchor, Sparkles, Zap, Package, ArrowUpRight } from 'lucide-react';
import { sound } from '../utils/audio';

interface ShipyardModalProps {
  currentBoatTier: number;
  coins: number;
  onUpgradeBoat: (targetTier: number) => void;
  onClose: () => void;
}

export const ShipyardModal: React.FC<ShipyardModalProps> = ({
  currentBoatTier,
  coins,
  onUpgradeBoat,
  onClose,
}) => {
  const currentDef = BOAT_TIERS.find(b => b.tier === currentBoatTier) || BOAT_TIERS[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-4xl h-[88vh] max-h-[760px] bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-cyan-500/40 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-white font-sans">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-cyan-950/70 via-slate-900 to-blue-950/70 border-b border-cyan-500/30 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-2xl shadow-inner">
              ⚓
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-cyan-200 tracking-tight">
                  POND SHIPYARD & FLEET WORKSHOP
                </h2>
                <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  Tier {currentBoatTier} / 5
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Upgrade from Grandpa's wooden dinghy up to the legendary Sovereign Mega Yacht!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-3.5 py-1.5 rounded-xl bg-amber-950/60 border border-amber-600/40 text-amber-300 font-extrabold text-xs flex items-center gap-1.5 shadow-inner">
              <span>🪙</span>
              <span className="font-mono">{coins.toLocaleString()} Coins</span>
            </div>

            <button
              onClick={() => {
                sound.playClick();
                onClose();
              }}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer border border-slate-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Current Boat Showcase Bar */}
        <div className="px-6 py-3 bg-slate-950/70 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{currentDef.icon}</span>
            <div>
              <div className="text-xs font-bold text-slate-400">Current Flagship Vessel</div>
              <div className="text-sm font-black text-cyan-300">{currentDef.name}</div>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-semibold">
            <div className="flex items-center gap-1.5 text-emerald-300">
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              <span>+{currentDef.biteSpeedBonus}% Bite Speed</span>
            </div>
            <div className="flex items-center gap-1.5 text-amber-300">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>+{currentDef.luckBonus}% Rare Luck</span>
            </div>
            <div className="flex items-center gap-1.5 text-cyan-300">
              <Package className="w-3.5 h-3.5 text-cyan-400" />
              <span>+{currentDef.capacityBonus} Slots</span>
            </div>
          </div>
        </div>

        {/* Boat Tiers Cards List */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          {BOAT_TIERS.map(boat => {
            const isCurrent = boat.tier === currentBoatTier;
            const isPurchased = boat.tier <= currentBoatTier;
            const isNext = boat.tier === currentBoatTier + 1;
            const canAfford = coins >= boat.cost;

            return (
              <div
                key={boat.tier}
                className={`p-5 rounded-2xl border transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                  isCurrent
                    ? 'bg-cyan-950/30 border-cyan-500/60 shadow-lg ring-1 ring-cyan-500/40'
                    : isPurchased
                    ? 'bg-slate-900/60 border-slate-700/80'
                    : isNext && canAfford
                    ? 'bg-slate-800/90 border-amber-500/60 shadow-md hover:border-amber-400'
                    : 'bg-slate-950/50 border-slate-800 opacity-70'
                }`}
              >
                {/* Left: Boat Info & Icon */}
                <div className="flex items-start gap-4 flex-1">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-md shrink-0 ${
                    isCurrent
                      ? 'bg-cyan-900/50 border border-cyan-400'
                      : isPurchased
                      ? 'bg-slate-800 border border-slate-700'
                      : 'bg-slate-900 border border-slate-800'
                  }`}>
                    {boat.icon}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-base font-black text-white">{boat.name}</h4>
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                        Tier {boat.tier}
                      </span>
                      {isCurrent && (
                        <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Active Boat</span>
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-cyan-400/90 font-medium">{boat.subtitle}</p>
                    <p className="text-xs text-slate-400 max-w-xl leading-relaxed">{boat.description}</p>

                    {/* Features list */}
                    <div className="flex flex-wrap items-center gap-2 pt-2">
                      {boat.features.map((f, fIdx) => (
                        <span
                          key={fIdx}
                          className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-slate-800/90 border border-slate-700 text-slate-300"
                        >
                          ✦ {f}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right: Price & Upgrade Button */}
                <div className="flex md:flex-col items-center md:items-end justify-between w-full md:w-auto gap-3 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-800">
                  <div className="text-left md:text-right">
                    <div className="text-[10px] uppercase font-bold text-slate-400">Shipyard Cost</div>
                    <div className="text-base font-mono font-black text-amber-300">
                      {boat.cost === 0 ? 'Free (Inherited)' : `${boat.cost.toLocaleString()} 🪙`}
                    </div>
                  </div>

                  {isCurrent ? (
                    <div className="px-4 py-2 rounded-xl bg-cyan-950/80 border border-cyan-700 text-cyan-300 font-bold text-xs flex items-center gap-1.5 shadow-sm">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>At The Helm</span>
                    </div>
                  ) : isPurchased ? (
                    <button
                      onClick={() => {
                        sound.playClick();
                        onUpgradeBoat(boat.tier);
                      }}
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white font-bold text-xs transition-colors cursor-pointer"
                    >
                      Take Out
                    </button>
                  ) : isNext ? (
                    <button
                      onClick={() => {
                        if (canAfford) {
                          sound.playUpgrade();
                          onUpgradeBoat(boat.tier);
                        }
                      }}
                      disabled={!canAfford}
                      className={`px-5 py-2.5 rounded-xl font-black text-xs flex items-center gap-1.5 shadow-lg transition-all active:scale-95 cursor-pointer ${
                        canAfford
                          ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-amber-950/60'
                          : 'bg-slate-800 text-slate-500 border border-slate-700/60 cursor-not-allowed'
                      }`}
                    >
                      <ArrowUpRight className="w-4 h-4" />
                      <span>{canAfford ? 'Commission Boat' : 'Need More Coins'}</span>
                    </button>
                  ) : (
                    <div className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-600 font-bold text-xs">
                      Requires Tier {boat.tier - 1}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
