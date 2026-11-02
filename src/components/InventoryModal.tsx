import React, { useState } from 'react';
import { CaughtFish, FishSpecies } from '../types/game';
import { ALL_FISH, RARITY_CONFIG, FISH_VARIANTS } from '../data/fishData';
import { FishRenderer } from './FishRenderer';
import { X, Star, Coins, Sparkles, Filter, Trash2, ArrowUpDown } from 'lucide-react';
import { sound } from '../utils/audio';

interface InventoryModalProps {
  inventory: CaughtFish[];
  capacity: number;
  aquariumFishIds: string[];
  onSellFish: (instanceId: string) => void;
  onMassSell: (filter: 'common' | 'uncommon' | 'all_non_fav') => void;
  onToggleFavorite: (instanceId: string) => void;
  onToggleAquarium: (instanceId: string) => void;
  onClose: () => void;
}

export const InventoryModal: React.FC<InventoryModalProps> = ({
  inventory,
  capacity,
  aquariumFishIds,
  onSellFish,
  onMassSell,
  onToggleFavorite,
  onToggleAquarium,
  onClose,
}) => {
  const [selectedRarity, setSelectedRarity] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'value' | 'size' | 'rarity'>('recent');

  const speciesMap = new Map<string, FishSpecies>();
  ALL_FISH.forEach(f => speciesMap.set(f.id, f));

  // Filter & sort inventory
  const filteredList = inventory.filter(item => {
    const sp = speciesMap.get(item.speciesId);
    if (!sp) return false;
    if (selectedRarity !== 'all' && sp.rarity !== selectedRarity) return false;
    return true;
  });

  const sortedList = [...filteredList].sort((a, b) => {
    if (sortBy === 'value') return b.value - a.value;
    if (sortBy === 'size') return b.size - a.size;
    if (sortBy === 'rarity') {
      const order = ['Secret', 'Legendary', 'Epic', 'Rare', 'Uncommon', 'Common'];
      const rA = speciesMap.get(a.speciesId)?.rarity || 'Common';
      const rB = speciesMap.get(b.speciesId)?.rarity || 'Common';
      return order.indexOf(rA) - order.indexOf(rB);
    }
    return b.caughtAt - a.caughtAt;
  });

  // Calculate quick sell totals
  const commonNonFavCount = inventory.filter(f => {
    const sp = speciesMap.get(f.speciesId);
    return sp?.rarity === 'Common' && !f.isFavorite;
  }).length;

  const uncommonNonFavCount = inventory.filter(f => {
    const sp = speciesMap.get(f.speciesId);
    return (sp?.rarity === 'Common' || sp?.rarity === 'Uncommon') && !f.isFavorite;
  }).length;

  const allNonFavCount = inventory.filter(f => !f.isFavorite).length;
  const allNonFavValue = inventory.filter(f => !f.isFavorite).reduce((sum, f) => sum + f.value, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md select-none text-white animate-fade-in">
      <div className="relative w-full max-w-4xl h-[90vh] flex flex-col rounded-3xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-600 to-emerald-500 flex items-center justify-center text-xl shadow-md">
              🧺
            </div>
            <div>
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                <span>Fish Basket & Live Stock</span>
              </h2>
              <p className="text-xs text-slate-400">
                Manage caught fish, star favorites, populate your aquarium, or sell your entire catch.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700 text-xs font-bold text-slate-300">
              Capacity: <span className={inventory.length >= capacity ? 'text-rose-400 font-extrabold' : 'text-emerald-400 font-extrabold'}>
                {inventory.length}
              </span> / {capacity}
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mass Quick-Sell Actions */}
        <div className="p-3 border-b border-slate-800 bg-slate-900/40 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center flex-wrap gap-2">
            {/* Primary: Sell Entire Basket */}
            <button
              onClick={() => {
                if (allNonFavCount > 0) {
                  onMassSell('all_non_fav');
                  sound.playCoin();
                }
              }}
              disabled={allNonFavCount === 0}
              className={`px-4 py-2 rounded-xl font-black flex items-center gap-2 shadow-md transition-all cursor-pointer ${
                allNonFavCount > 0
                  ? 'bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 text-amber-950 shadow-amber-950/60 active:scale-95'
                  : 'bg-slate-800/50 text-slate-500 border border-slate-700/50 cursor-not-allowed'
              }`}
            >
              <Coins className="w-4 h-4" />
              <span>Sell Entire Basket ({allNonFavCount} Fish · +🪙 {allNonFavValue.toLocaleString()})</span>
            </button>

            <button
              onClick={() => {
                if (commonNonFavCount > 0) {
                  onMassSell('common');
                  sound.playCoin();
                }
              }}
              disabled={commonNonFavCount === 0}
              className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                commonNonFavCount > 0
                  ? 'bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700'
                  : 'bg-slate-800/40 text-slate-500 border border-slate-700/40 cursor-not-allowed'
              }`}
            >
              <span>Sell Commons ({commonNonFavCount})</span>
            </button>

            <button
              onClick={() => {
                if (uncommonNonFavCount > 0) {
                  onMassSell('uncommon');
                  sound.playCoin();
                }
              }}
              disabled={uncommonNonFavCount === 0}
              className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                uncommonNonFavCount > 0
                  ? 'bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700'
                  : 'bg-slate-800/40 text-slate-500 border border-slate-700/40 cursor-not-allowed'
              }`}
            >
            </button>
          </div>

          {/* Sort & Filter controls */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-slate-800 px-2 py-1 rounded-xl border border-slate-700">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent text-xs text-slate-200 font-semibold focus:outline-none"
              >
                <option value="recent">Most Recent</option>
                <option value="value">Highest Value</option>
                <option value="size">Largest Size</option>
                <option value="rarity">Rarity Tier</option>
              </select>
            </div>

            <select
              value={selectedRarity}
              onChange={(e) => setSelectedRarity(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1 text-xs text-slate-200 font-semibold focus:outline-none"
            >
              <option value="all">All Rarities</option>
              <option value="Common">Common</option>
              <option value="Uncommon">Uncommon</option>
              <option value="Rare">Rare</option>
              <option value="Epic">Epic</option>
              <option value="Legendary">Legendary</option>
              <option value="Secret">Secret</option>
            </select>
          </div>
        </div>

        {/* Fish Inventory Grid */}
        <div className="flex-1 p-4 overflow-y-auto">
          {sortedList.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 text-sm">
              <span className="text-4xl mb-2">🎣</span>
              <p className="font-semibold text-slate-400">Your basket is currently empty.</p>
              <p className="text-xs text-slate-500 mt-1">Cast into the pond to catch colorful fish!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {sortedList.map(item => {
                const sp = speciesMap.get(item.speciesId);
                if (!sp) return null;
                const rarityInfo = RARITY_CONFIG[sp.rarity];
                const variantInfo = FISH_VARIANTS[item.variant];
                const inAquarium = aquariumFishIds.includes(item.instanceId);

                return (
                  <div
                    key={item.instanceId}
                    className={`p-3.5 rounded-2xl border transition-all ${
                      item.isFavorite
                        ? 'bg-amber-950/25 border-amber-600/50 shadow-md'
                        : inAquarium
                        ? 'bg-cyan-950/25 border-cyan-600/50 shadow-md'
                        : 'bg-slate-800/70 border-slate-700/70'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-black text-xs text-white flex items-center gap-1.5">
                          <span>{sp.name}</span>
                          {item.variant !== 'Standard' && (
                            <span 
                              className="text-[10px] font-extrabold px-1.5 py-0.2 rounded"
                              style={{ color: variantInfo.color }}
                            >
                              ✨ {item.variant}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className={`text-[10px] font-bold px-2 py-0.2 rounded-full border ${rarityInfo.bgBadge}`}>
                            {sp.rarity}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {item.size} cm
                          </span>
                        </div>
                      </div>

                      {/* Favorite Toggle Button */}
                      <button
                        onClick={() => onToggleFavorite(item.instanceId)}
                        className={`p-1.5 rounded-xl border transition-colors cursor-pointer ${
                          item.isFavorite
                            ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                            : 'bg-slate-800/80 border-slate-700 text-slate-500 hover:text-amber-400'
                        }`}
                        title={item.isFavorite ? 'Favorited (Protected from quick-sell)' : 'Mark as Favorite'}
                      >
                        <Star className={`w-3.5 h-3.5 ${item.isFavorite ? 'fill-amber-400' : ''}`} />
                      </button>
                    </div>

                    {/* Fish Preview */}
                    <div className="h-16 flex items-center justify-center my-1.5">
                      <FishRenderer
                        species={sp}
                        variant={item.variant}
                        size={90}
                        animate={false}
                      />
                    </div>

                    {/* Bottom Actions: Sell & Aquarium toggle */}
                    <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between gap-2">
                      <button
                        onClick={() => onToggleAquarium(item.instanceId)}
                        className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-colors cursor-pointer ${
                          inAquarium
                            ? 'bg-cyan-950 text-cyan-300 border-cyan-500'
                            : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-cyan-500'
                        }`}
                        title="Display this fish swimming in the live pond / custom aquarium"
                      >
                        {inAquarium ? '🐠 in Aquarium' : '+ Aquarium'}
                      </button>

                      <button
                        onClick={() => {
                          onSellFish(item.instanceId);
                          sound.playCoin();
                        }}
                        className="px-2.5 py-1 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/50 text-[11px] font-extrabold flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <span>🪙</span>
                        <span>{item.value.toLocaleString()}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
