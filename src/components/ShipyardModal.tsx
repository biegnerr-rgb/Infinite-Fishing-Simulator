import React from 'react';
import { BOAT_TIERS } from '../data/storyData';
import { X, CheckCircle2, Anchor, Sparkles, Zap, Package, ArrowUpRight, Gauge } from 'lucide-react';
import { sound } from '../utils/audio';

interface ShipyardModalProps {
  currentBoatTier: number;
  maxBoatTier?: number;
  coins: number;
  onUpgradeBoat: (targetTier: number) => void;
  onClose: () => void;
}

export const ShipyardModal: React.FC<ShipyardModalProps> = ({
  currentBoatTier,
  maxBoatTier,
  coins,
  onUpgradeBoat,
  onClose,
}) => {
  const unlockedTier = Math.max(maxBoatTier || 1, currentBoatTier || 1);
  const currentDef = BOAT_TIERS.find(b => b.tier === currentBoatTier) || BOAT_TIERS[0];

  if (!currentDef) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md text-slate-100 select-none"
        role="dialog"
        aria-modal="true"
        aria-label="Shipyard"
        onClick={onClose}
      >
        <div
          className="w-full max-w-md rounded-2xl border border-cyan-500/40 bg-slate-900 p-6 shadow-2xl space-y-4"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className="text-xl font-black text-cyan-200">Shipyard unavailable</h2>
          <p className="text-sm text-slate-300">The boat upgrade data could not be loaded. Please close this window and try again.</p>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-sm cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md text-slate-100 select-none animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="Pond Shipyard"
      onClick={onClose}
    >
      <div
        className="relative flex flex-col w-full max-w-5xl h-[88vh] max-h-[780px] rounded-3xl border border-cyan-500/40 bg-gradient-to-br from-[#0f2537] via-slate-900 to-[#07111f] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <header className="flex items-center justify-between gap-4 px-5 py-4 border-b border-cyan-400/20 bg-cyan-950/35 shrink-0">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="grid place-items-center w-11 h-11 shrink-0 rounded-2xl bg-cyan-500/15 border border-cyan-400/35 text-cyan-200 shadow-inner">
              <Anchor size={22} />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-black tracking-tight text-cyan-100">
                POND SHIPYARD
              </h2>
              <p className="text-xs text-slate-300 truncate">
                Commission stronger vessels or take any owned boat out on the lake
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="px-3 py-1.5 rounded-xl bg-amber-950/50 border border-amber-500/35 text-amber-300 font-mono text-xs sm:text-sm font-black whitespace-nowrap">
              🪙 {coins.toLocaleString()}
            </div>
            <button
              type="button"
              aria-label="Close shipyard"
              onClick={() => {
                sound.playClick();
                onClose();
              }}
              className="grid place-items-center w-9 h-9 rounded-xl border border-slate-700 bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        {/* Active Vessel Summary */}
        <section className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 bg-slate-950/55 border-b border-slate-800/90 shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-3xl leading-none">{currentDef.icon}</span>
            <div>
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                Active Vessel · Tier {currentBoatTier}/5
              </div>
              <strong className="text-sm font-black text-cyan-300">{currentDef.name}</strong>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs font-bold">
            <span className="inline-flex items-center gap-1 text-emerald-300">
              <Zap size={13} /> +{currentDef.biteSpeedBonus}% bite speed
            </span>
            <span className="inline-flex items-center gap-1 text-amber-300">
              <Sparkles size={13} /> +{currentDef.luckBonus}% rare luck
            </span>
            <span className="inline-flex items-center gap-1 text-cyan-300">
              <Package size={13} /> +{currentDef.capacityBonus} basket slots
            </span>
            <span className="inline-flex items-center gap-1 text-sky-300">
              <Gauge size={13} /> +{currentDef.autoSpeedBonus}% auto speed
            </span>
          </div>
        </section>

        {/* Boat Tiers List */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-5 space-y-3">
          {BOAT_TIERS.map(boat => {
            const isCurrent = boat.tier === currentBoatTier;
            const isOwned = boat.tier <= unlockedTier;
            const isNext = boat.tier === unlockedTier + 1;
            const canAfford = coins >= boat.cost;
            const coinsNeeded = Math.max(0, boat.cost - coins);

            return (
              <article
                key={boat.tier}
                className={`flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl border transition-all ${
                  isCurrent
                    ? 'border-cyan-500/70 bg-cyan-950/30 shadow-lg shadow-cyan-950/30'
                    : isOwned
                    ? 'border-emerald-600/40 bg-slate-800/55 hover:border-emerald-500/60'
                    : isNext && canAfford
                    ? 'border-amber-500/70 bg-amber-950/20 shadow-md'
                    : 'border-slate-800 bg-slate-950/50'
                }`}
              >
                <div className="flex items-start gap-3.5 flex-1 min-w-[260px]">
                  <div
                    className={`grid place-items-center w-14 h-14 shrink-0 rounded-2xl border text-3xl ${
                      isCurrent
                        ? 'bg-cyan-900/50 border-cyan-500/50'
                        : isOwned
                        ? 'bg-slate-800 border-emerald-500/35'
                        : 'bg-slate-900 border-slate-700/70'
                    }`}
                  >
                    {boat.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center flex-wrap gap-2">
                      <strong className="text-base font-black text-slate-100">{boat.name}</strong>
                      <span className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-slate-300 text-[10px] font-extrabold">
                        TIER {boat.tier}
                      </span>
                      {isCurrent && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-cyan-500/20 border border-cyan-400/40 text-cyan-200 text-[10px] font-black">
                          <CheckCircle2 size={11} /> AT THE HELM
                        </span>
                      )}
                      {!isCurrent && isOwned && (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/35 text-emerald-300 text-[10px] font-bold">
                          OWNED
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 text-xs font-semibold text-cyan-300">{boat.subtitle}</div>
                    <p className="mt-1.5 mb-2.5 max-w-2xl text-xs text-slate-300/90 leading-relaxed">
                      {boat.description}
                    </p>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      <span className="px-2 py-0.5 rounded-md bg-emerald-950/60 border border-emerald-700/40 text-emerald-300 text-[10px] font-bold">
                        +{boat.biteSpeedBonus}% Bite Speed
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-amber-950/60 border border-amber-700/40 text-amber-300 text-[10px] font-bold">
                        +{boat.luckBonus}% Rare Luck
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-cyan-950/60 border border-cyan-700/40 text-cyan-300 text-[10px] font-bold">
                        +{boat.capacityBonus} Basket Slots
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-sky-950/60 border border-sky-700/40 text-sky-300 text-[10px] font-bold">
                        +{boat.autoSpeedBonus}% Auto-Fisher
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {(boat.features || []).map((feature, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 rounded-md bg-slate-800/80 border border-slate-700/60 text-slate-300 text-[10px]"
                        >
                          ✦ {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 min-w-[210px]">
                  <div className="text-left sm:text-right">
                    <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                      {isOwned ? 'STATUS' : 'SHIPYARD COST'}
                    </div>
                    <strong className={`text-sm font-black ${isOwned ? 'text-emerald-300' : 'text-amber-300'}`}>
                      {isOwned
                        ? 'Commissioned'
                        : boat.cost === 0
                        ? 'Free'
                        : `${boat.cost.toLocaleString()} coins`}
                    </strong>
                  </div>

                  {isCurrent ? (
                    <span className="px-3.5 py-2 rounded-xl bg-cyan-500/15 border border-cyan-400/40 text-cyan-200 text-xs font-black whitespace-nowrap">
                      Active Boat
                    </span>
                  ) : isOwned ? (
                    <button
                      type="button"
                      onClick={() => {
                        sound.playClick();
                        onUpgradeBoat(boat.tier);
                      }}
                      className="px-4 py-2 rounded-xl border border-emerald-500/50 bg-emerald-950/60 hover:bg-emerald-900/70 text-emerald-200 text-xs font-black transition-colors cursor-pointer whitespace-nowrap"
                    >
                      Take out
                    </button>
                  ) : isNext ? (
                    <button
                      type="button"
                      disabled={!canAfford}
                      onClick={() => {
                        if (canAfford) {
                          sound.playUpgrade();
                          onUpgradeBoat(boat.tier);
                        }
                      }}
                      className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-black transition-all whitespace-nowrap ${
                        canAfford
                          ? 'bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 shadow-lg shadow-amber-950/40 cursor-pointer active:scale-95'
                          : 'bg-slate-800 border border-slate-700 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      <ArrowUpRight size={15} />
                      <span>{canAfford ? 'Commission boat' : `Need ${coinsNeeded.toLocaleString()} more`}</span>
                    </button>
                  ) : (
                    <span className="px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-500 text-xs font-bold whitespace-nowrap">
                      Requires Tier {boat.tier - 1}
                    </span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
};
