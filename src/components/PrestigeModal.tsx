import React, { useState } from 'react';
import { PRESTIGE_UPGRADES } from '../data/upgradesData';
import { Sparkles, X, AlertTriangle, ShieldCheck, ArrowRight, CheckCircle2 } from 'lucide-react';
import { sound } from '../utils/audio';

interface PrestigeModalProps {
  starPearls: number;
  lifetimeCoins: number;
  uniqueFishCaught: number;
  prestigeUpgrades: Record<string, number>;
  prestigeCount: number;
  fishCaughtThisRun?: number;
  onAscend: (earnedPearls: number) => void;
  onBuyPrestigeUpgrade: (upgradeId: string, cost: number) => void;
  onClose: () => void;
}

export const PrestigeModal: React.FC<PrestigeModalProps> = ({
  starPearls,
  lifetimeCoins,
  uniqueFishCaught,
  prestigeUpgrades,
  prestigeCount,
  fishCaughtThisRun = 0,
  onAscend,
  onBuyPrestigeUpgrade,
  onClose,
}) => {
  const [showConfirm, setShowConfirm] = useState<boolean>(false);

  // Star Pearls calculation formula
  const pearlsFromCoins = Math.floor(Math.sqrt(lifetimeCoins / 2000));
  const pearlsFromSpecies = Math.floor(uniqueFishCaught / 3);
  const potentialPearls = Math.max(1, pearlsFromCoins + pearlsFromSpecies);

  // Ascension Requirements / Goals
  // Scaled fish goal: 35 for first ascension, +15 for each subsequent tier
  const requiredFish = 35 + prestigeCount * 15;
  const requiredCoins = 5000;

  const hasMetFishGoal = fishCaughtThisRun >= requiredFish;
  const hasMetCoinGoal = lifetimeCoins >= requiredCoins;
  const canAscend = hasMetFishGoal && hasMetCoinGoal;

  const fishProgressPercent = Math.min(100, Math.round((fishCaughtThisRun / requiredFish) * 100));
  const coinProgressPercent = Math.min(100, Math.round((lifetimeCoins / requiredCoins) * 100));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md select-none text-white animate-fade-in">
      <div className="relative w-full max-w-3xl h-[88vh] flex flex-col rounded-3xl bg-slate-900 border border-purple-500/40 shadow-2xl shadow-purple-950/60 overflow-hidden">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-purple-900/60 bg-gradient-to-r from-purple-950/80 to-slate-950/90 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center text-xl shadow-lg shadow-purple-950">
              🔮
            </div>
            <div>
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                <span>Cosmic Ascension & Mystic Shrine</span>
              </h2>
              <p className="text-xs text-purple-300/80">
                Transcend ordinary waters to claim permanent Star Pearls and cosmic powers.
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

        {/* Content body */}
        <div className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-5">
          
          {/* Ascension Banner & CTA */}
          <div className="p-5 rounded-3xl bg-gradient-to-br from-purple-950/60 via-slate-900 to-indigo-950/60 border border-purple-500/50 shadow-xl relative overflow-hidden">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 relative z-10">
              <div>
                <span className="text-xs font-bold text-purple-300 uppercase tracking-widest block mb-1">
                  Ascension Tier {prestigeCount + 1}
                </span>
                <h3 className="text-xl font-extrabold text-white">
                  Ready to Ascend the Pond?
                </h3>
                <p className="text-xs text-slate-300 mt-1 max-w-md">
                  Reset your current coins and basic equipment in exchange for{' '}
                  <span className="font-extrabold text-purple-300 font-mono text-sm">
                    +{potentialPearls} Star Pearls
                  </span>
                  . Permanent upgrades and discovered fish in your encyclopedia will never be lost!
                </p>
              </div>

              <div className="shrink-0 w-full md:w-auto text-center">
                <button
                  onClick={() => {
                    if (canAscend) setShowConfirm(true);
                  }}
                  disabled={!canAscend}
                  className={`w-full md:w-auto px-6 py-3 rounded-2xl font-black text-sm tracking-wide shadow-xl flex items-center justify-center gap-2 transition-transform active:scale-95 cursor-pointer ${
                    canAscend
                      ? 'bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 hover:from-purple-500 hover:to-amber-400 text-white shadow-purple-950/80 animate-pulse'
                      : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  <span>{canAscend ? `Ascend for +${potentialPearls} 🔮` : `Trial Incomplete`}</span>
                </button>
                {!canAscend && (
                  <span className="text-[10px] text-amber-400 font-semibold block mt-1.5">
                    {!hasMetFishGoal
                      ? `Catch ${requiredFish - fishCaughtThisRun} more fish to unlock`
                      : `Earn ${(requiredCoins - lifetimeCoins).toLocaleString()} more coins to unlock`}
                  </span>
                )}
              </div>
            </div>

            {/* Ascension Trial Requirements Cards */}
            <div className="mt-4 pt-4 border-t border-purple-900/50 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Requirement 1: Fish Caught this run */}
              <div className={`p-3 rounded-2xl border transition-all ${
                hasMetFishGoal
                  ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
                  : 'bg-slate-950/60 border-purple-900/60 text-slate-300'
              }`}>
                <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span>🐟</span>
                    <span>Incarnation Catch Goal:</span>
                  </div>
                  <span className="font-mono text-[11px] font-extrabold flex items-center gap-1">
                    {fishCaughtThisRun} / {requiredFish}
                    {hasMetFishGoal && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      hasMetFishGoal ? 'bg-emerald-400' : 'bg-gradient-to-r from-purple-500 to-pink-500'
                    }`}
                    style={{ width: `${fishProgressPercent}%` }}
                  />
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  {hasMetFishGoal
                    ? '✓ Trial complete! Target catches achieved.'
                    : `Catch ${requiredFish - fishCaughtThisRun} more fish in this run.`}
                </span>
              </div>

              {/* Requirement 2: Coins Goal */}
              <div className={`p-3 rounded-2xl border transition-all ${
                hasMetCoinGoal
                  ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
                  : 'bg-slate-950/60 border-purple-900/60 text-slate-300'
              }`}>
                <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span>🪙</span>
                    <span>Prosperity Goal:</span>
                  </div>
                  <span className="font-mono text-[11px] font-extrabold flex items-center gap-1">
                    {Math.min(lifetimeCoins, requiredCoins).toLocaleString()} / {requiredCoins.toLocaleString()}
                    {hasMetCoinGoal && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      hasMetCoinGoal ? 'bg-emerald-400' : 'bg-gradient-to-r from-amber-500 to-yellow-400'
                    }`}
                    style={{ width: `${coinProgressPercent}%` }}
                  />
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  {hasMetCoinGoal
                    ? '✓ Prosperity trial complete!'
                    : `Earn ${(requiredCoins - lifetimeCoins).toLocaleString()} more lifetime coins.`}
                </span>
              </div>
            </div>
          </div>

          {/* Current Star Pearls Wallet */}
          <div className="flex items-center justify-between px-4 py-2.5 rounded-2xl bg-slate-800/80 border border-purple-800/50">
            <div className="flex items-center gap-2">
              <span className="text-xl">🔮</span>
              <span className="text-xs font-bold text-slate-300">Available Star Pearls:</span>
            </div>
            <span className="font-mono font-black text-purple-300 text-base">
              {starPearls.toLocaleString()} Pearls
            </span>
          </div>

          {/* Mystic Shrine Permanent Upgrades */}
          <div>
            <h4 className="text-sm font-black text-purple-200 uppercase tracking-wider mb-2.5 flex items-center gap-2">
              <span>🌟 Mystic Shrine Blessings</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.keys(PRESTIGE_UPGRADES).map(key => {
                const def = PRESTIGE_UPGRADES[key];
                const currentLevel = prestigeUpgrades[key] || 0;
                const isMax = currentLevel >= def.maxLevel;
                const cost = Math.floor(def.baseCost * Math.pow(def.costMultiplier, currentLevel));
                const canAfford = !isMax && starPearls >= cost;

                return (
                  <div
                    key={def.id}
                    className="p-3.5 rounded-2xl bg-slate-900/90 border border-purple-900/60 hover:border-purple-600/70 transition-all shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <div className="font-black text-xs text-purple-100 flex items-center gap-2">
                          <span>{def.name}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-800">
                            {isMax ? 'MAX' : `Lv. ${currentLevel} / ${def.maxLevel}`}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {def.description}
                        </p>
                      </div>

                      {isMax ? (
                        <span className="px-3 py-1 rounded-xl bg-purple-950 border border-purple-700 text-purple-400 text-xs font-bold shrink-0">
                          Maxed
                        </span>
                      ) : (
                        <button
                          onClick={() => {
                            if (canAfford) {
                              onBuyPrestigeUpgrade(def.id, cost);
                              sound.playUpgrade();
                            }
                          }}
                          disabled={!canAfford}
                          className={`px-3 py-1.5 rounded-xl font-extrabold text-xs flex items-center gap-1 shrink-0 transition-all cursor-pointer ${
                            canAfford
                              ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-950 active:scale-95'
                              : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                          }`}
                        >
                          <span>🔮</span>
                          <span className="font-mono">{cost}</span>
                        </button>
                      )}
                    </div>

                    <div className="p-2 rounded-xl bg-slate-950/80 text-[11px] text-purple-300 font-medium">
                      Effect: {def.effectDescription(currentLevel)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* Confirmation Modal */}
        {showConfirm && (
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md z-30 flex items-center justify-center p-4">
            <div className="relative w-full max-w-md rounded-3xl p-6 bg-slate-900 border-2 border-purple-500 shadow-2xl text-center">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center mx-auto text-2xl mb-3">
                ⚠️
              </div>

              <h3 className="text-xl font-black text-white mb-2">
                Confirm Cosmic Ascension?
              </h3>

              <div className="text-left text-xs space-y-2 p-3.5 rounded-2xl bg-slate-950 border border-slate-800 text-slate-300 mb-4">
                <div className="flex items-center gap-2 text-rose-400 font-semibold">
                  <span>❌ Resets:</span> Current coins, basic tackle upgrades, fish in basket
                </div>
                <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                  <span>✅ Keeps:</span> Complete Encyclopedia, size records, achievements, and permanent shrine upgrades
                </div>
                <div className="flex items-center gap-2 text-purple-300 font-black">
                  <span>🔮 Awards:</span> +{potentialPearls} permanent Star Pearls
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowConfirm(false);
                    onAscend(potentialPearls);
                    sound.playChest();
                    onClose();
                  }}
                  className="py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 text-white font-black text-xs shadow-lg shadow-purple-950 cursor-pointer"
                >
                  Ascend Now! 🌌
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
