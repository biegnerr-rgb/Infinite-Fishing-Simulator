import React from 'react';
import { UPGRADES, ROD_TIERS } from '../data/upgradesData';
import { Sparkles, ArrowUpRight, CheckCircle2 } from 'lucide-react';
import { sound } from '../utils/audio';

interface UpgradesPanelProps {
  coins: number;
  upgrades: Record<string, number>;
  boatTier?: number;
  onBuyUpgrade: (upgradeId: string) => void;
  onOpenShipyard?: () => void;
}

export const UpgradesPanel: React.FC<UpgradesPanelProps> = ({
  coins,
  upgrades,
  boatTier = 1,
  onBuyUpgrade,
  onOpenShipyard,
}) => {
  const upgradeKeys = Object.keys(UPGRADES);

  return (
    <div className="w-full h-full p-4 overflow-y-auto space-y-3.5 select-none text-white">
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div>
          <h2 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
            <span>🛠️ Tackle & Gear Workshop</span>
          </h2>
          <p className="text-xs text-slate-400">
            Invest your coins into stronger rods, enchanted baits, and automated fishing drones.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {onOpenShipyard && (
            <button
              onClick={onOpenShipyard}
              className="px-3 py-1.5 rounded-xl bg-cyan-950/70 hover:bg-cyan-900/80 border border-cyan-500/50 text-cyan-200 font-extrabold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Open Boat Shipyard"
            >
              <span>⚓</span>
              <span>Boat Tier {boatTier}</span>
            </button>
          )}
          <div className="px-3 py-1.5 rounded-xl bg-amber-950/60 border border-amber-600/40 text-amber-300 font-extrabold text-xs flex items-center gap-1.5">
            <span>🪙</span>
            <span className="font-mono">{coins.toLocaleString()} Coins</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {upgradeKeys.map((key) => {
          const def = UPGRADES[key];
          const currentLevel = upgrades[key] || (key === 'fishing_rod' || key === 'multiple_lines' || key === 'pond_expansion' ? 1 : 0);
          const isMax = currentLevel >= def.maxLevel;
          
          // Cost formula
          const cost = Math.floor(def.baseCost * Math.pow(def.costMultiplier, currentLevel));
          const canAfford = !isMax && coins >= cost;

          return (
            <div
              key={def.id}
              className={`p-3.5 rounded-2xl border transition-all ${
                isMax
                  ? 'bg-slate-900/60 border-emerald-900/50'
                  : canAfford
                  ? 'bg-slate-800/80 border-slate-700/80 hover:border-emerald-500/50 shadow-md'
                  : 'bg-slate-900/40 border-slate-800/80 opacity-80'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-sm text-slate-100">
                      {def.name}
                    </span>
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                      isMax 
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-700' 
                        : 'bg-slate-700 text-slate-300 border-slate-600'
                    }`}>
                      {isMax ? 'MAX TIER' : `Lv. ${currentLevel} / ${def.maxLevel}`}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                    {def.description}
                  </p>
                </div>

                {/* Upgrade Button */}
                {isMax ? (
                  <div className="px-3 py-1.5 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-400 text-xs font-bold flex items-center gap-1 shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Maxed</span>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      if (canAfford) {
                        onBuyUpgrade(def.id);
                        sound.playUpgrade();
                      }
                    }}
                    disabled={!canAfford}
                    className={`px-3.5 py-1.5 rounded-xl font-extrabold text-xs flex items-center gap-1.5 shrink-0 transition-all active:scale-95 cursor-pointer ${
                      canAfford
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-emerald-950 shadow-lg shadow-emerald-950'
                        : 'bg-slate-800 text-slate-500 border border-slate-700/60 cursor-not-allowed'
                    }`}
                  >
                    <span>🪙</span>
                    <span className="font-mono">{cost.toLocaleString()}</span>
                  </button>
                )}
              </div>

              {/* Current Effect & Next Level Preview */}
              <div className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 text-[11px] space-y-1">
                <div className="text-emerald-400 font-semibold flex items-center justify-between">
                  <span>Current:</span>
                  <span className="text-slate-200 font-medium">
                    {def.effectDescription(currentLevel)}
                  </span>
                </div>
                {!isMax && (
                  <div className="text-slate-400 font-medium flex items-center justify-between border-t border-slate-800/80 pt-1">
                    <span className="flex items-center gap-1 text-amber-400">
                      <ArrowUpRight className="w-3 h-3" /> Next Lv.{currentLevel + 1}:
                    </span>
                    <span className="text-amber-200/90 font-medium">
                      {def.effectDescription(currentLevel + 1)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
