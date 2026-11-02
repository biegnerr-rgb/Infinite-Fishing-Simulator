import React from 'react';
import { X, ShoppingBag, Sparkles, Coins } from 'lucide-react';
import { sound } from '../utils/audio';

interface MerchantModalProps {
  coins: number;
  starPearls: number;
  onBuyItem: (itemId: string, costCoins: number, costPearls: number) => void;
  onClose: () => void;
}

export const MerchantModal: React.FC<MerchantModalProps> = ({
  coins,
  starPearls,
  onBuyItem,
  onClose,
}) => {
  const deals = [
    {
      id: 'pearl_bundle',
      name: 'Star Pearl Pouch',
      description: 'Barnaby dredged up 2 celestial Star Pearls from the deep ocean floor.',
      costCoins: 8000,
      costPearls: 0,
      icon: '🔮',
      effect: '+2 Star Pearls',
    },
    {
      id: 'golden_chum',
      name: 'Barnaby\'s Golden Chum',
      description: 'A secret fragrant fish chum that instantly awards 2,500 bonus coins!',
      costCoins: 1000,
      costPearls: 0,
      icon: '✨',
      effect: '+2,500 Instant Coins',
    },
    {
      id: 'lucky_charm',
      name: 'Otter\'s Lucky River Stone',
      description: 'A smooth river pebble polished by Barnaby himself. Grants +1 permanent Star Pearl!',
      costCoins: 15000,
      costPearls: 0,
      icon: '🪨',
      effect: '+1 Star Pearl',
    },
    {
      id: 'mystery_crate',
      name: 'Sunken Mystery Crate',
      description: 'Barnaby cracked open a sunken shipping container! Contains 6,000 Coins!',
      costCoins: 2500,
      costPearls: 0,
      icon: '📦',
      effect: '+6,000 Instant Coins',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md select-none text-white animate-fade-in">
      <div className="relative w-full max-w-lg rounded-3xl bg-slate-900 border-2 border-amber-600/60 shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-amber-800/50 bg-gradient-to-r from-amber-950/80 to-slate-950/90 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-600/30 border border-amber-500/50 flex items-center justify-center text-3xl shadow-md">
              🦦
            </div>
            <div>
              <h2 className="text-xl font-black text-amber-200 flex items-center gap-2">
                <span>Barnaby's Floating Houseboat</span>
              </h2>
              <p className="text-xs text-amber-300/80">
                "Welcome friend! Best tackle trade deals on this side of the continent!"
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

        {/* Goods List */}
        <div className="p-4 sm:p-5 space-y-3">
          {deals.map(deal => {
            const canAfford = coins >= deal.costCoins && starPearls >= deal.costPearls;

            return (
              <div
                key={deal.id}
                className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/80 hover:border-amber-500/50 flex items-center justify-between gap-3 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-900/80 border border-slate-700 flex items-center justify-center text-2xl shrink-0">
                    {deal.icon}
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-slate-100">
                      {deal.name}
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {deal.description}
                    </p>
                    <span className="text-[10px] font-bold text-amber-400 mt-1 inline-block">
                      Benefit: {deal.effect}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    if (canAfford) {
                      onBuyItem(deal.id, deal.costCoins, deal.costPearls);
                      sound.playCoin();
                    }
                  }}
                  disabled={!canAfford}
                  className={`px-4 py-2 rounded-xl font-extrabold text-xs flex items-center gap-1.5 shrink-0 transition-transform cursor-pointer ${
                    canAfford
                      ? 'bg-amber-500 hover:bg-amber-400 text-amber-950 shadow-md active:scale-95'
                      : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                  }`}
                >
                  <span>🪙</span>
                  <span className="font-mono">{deal.costCoins.toLocaleString()}</span>
                </button>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
};
