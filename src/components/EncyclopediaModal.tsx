import React, { useState } from 'react';
import { FishSpecies, FishDiscoveryRecord, Rarity, FishVariant } from '../types/game';
import { ALL_FISH, RARITY_CONFIG, FISH_VARIANTS } from '../data/fishData';
import { LOCATIONS } from '../data/locationsData';
import { ROD_TIERS } from '../data/upgradesData';
import { FishRenderer } from './FishRenderer';
import { X, Trophy, Search, Filter, Sparkles, BookOpen } from 'lucide-react';

interface EncyclopediaModalProps {
  discoveries: Record<string, FishDiscoveryRecord>;
  onClose: () => void;
}

export const EncyclopediaModal: React.FC<EncyclopediaModalProps> = ({
  discoveries,
  onClose,
}) => {
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [selectedRarity, setSelectedRarity] = useState<string>('all');
  const [selectedDiscoveredFilter, setSelectedDiscoveredFilter] = useState<'all' | 'discovered' | 'undiscovered'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [inspectFish, setInspectFish] = useState<FishSpecies | null>(null);

  // Stats calculation
  const totalSpecies = ALL_FISH.length;
  const totalDiscovered = Object.values(discoveries).filter(d => d.discovered).length;
  const discoveryPercent = Math.round((totalDiscovered / totalSpecies) * 100);

  // Filter species
  const filteredFish = ALL_FISH.filter(fish => {
    const isDiscovered = !!discoveries[fish.id]?.discovered;

    if (selectedLocation !== 'all' && fish.locationId !== selectedLocation) return false;
    if (selectedRarity !== 'all' && fish.rarity !== selectedRarity) return false;
    if (selectedDiscoveredFilter === 'discovered' && !isDiscovered) return false;
    if (selectedDiscoveredFilter === 'undiscovered' && isDiscovered) return false;

    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchesName = fish.name.toLowerCase().includes(q);
      const matchesSci = fish.scientificName.toLowerCase().includes(q);
      return matchesName || matchesSci;
    }

    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md select-none text-white animate-fade-in">
      <div className="relative w-full max-w-4xl h-[90vh] flex flex-col rounded-3xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-600 to-indigo-500 flex items-center justify-center text-xl shadow-md">
              📖
            </div>
            <div>
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                <span>Fish Encyclopedia & Log</span>
              </h2>
              <p className="text-xs text-slate-400">
                Logbook of all documented aquatic specimens across the cosmos.
              </p>
            </div>
          </div>

          {/* Discovery Progress Meter */}
          <div className="hidden sm:flex items-center gap-3 bg-slate-800/80 px-4 py-2 rounded-2xl border border-slate-700">
            <div className="text-right">
              <span className="text-[11px] text-slate-400 block uppercase font-bold">Catalogued</span>
              <span className="text-sm font-extrabold text-emerald-400 font-mono">
                {totalDiscovered} / {totalSpecies} ({discoveryPercent}%)
              </span>
            </div>
            <div className="w-16 h-2 rounded-full bg-slate-700 overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all"
                style={{ width: `${discoveryPercent}%` }}
              />
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Controls Bar */}
        <div className="p-3 sm:p-4 border-b border-slate-800 bg-slate-900/50 flex flex-wrap items-center gap-2.5 text-xs">
          {/* Location Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto py-1 max-w-full">
            <button
              onClick={() => setSelectedLocation('all')}
              className={`px-3 py-1.5 rounded-xl font-bold transition-colors cursor-pointer shrink-0 ${
                selectedLocation === 'all'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              All Waters
            </button>
            {LOCATIONS.map(loc => (
              <button
                key={loc.id}
                onClick={() => setSelectedLocation(loc.id)}
                className={`px-3 py-1.5 rounded-xl font-bold transition-colors cursor-pointer shrink-0 ${
                  selectedLocation === loc.id
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {loc.name}
              </button>
            ))}
          </div>

          {/* Rarity Dropdown & Discovery toggle */}
          <div className="flex items-center gap-2 ml-auto">
            <select
              value={selectedRarity}
              onChange={(e) => setSelectedRarity(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 font-semibold focus:outline-none"
            >
              <option value="all">All Rarities</option>
              <option value="Common">Common</option>
              <option value="Uncommon">Uncommon</option>
              <option value="Rare">Rare</option>
              <option value="Epic">Epic</option>
              <option value="Legendary">Legendary</option>
              <option value="Secret">Secret</option>
            </select>

            <select
              value={selectedDiscoveredFilter}
              onChange={(e) => setSelectedDiscoveredFilter(e.target.value as any)}
              className="bg-slate-800 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 font-semibold focus:outline-none"
            >
              <option value="all">All Status</option>
              <option value="discovered">Discovered Only</option>
              <option value="undiscovered">Undiscovered Only</option>
            </select>
          </div>
        </div>

        {/* Species Grid */}
        <div className="flex-1 p-4 overflow-y-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {filteredFish.map(fish => {
              const rec = discoveries[fish.id];
              const isDiscovered = !!rec?.discovered;
              const rarityInfo = RARITY_CONFIG[fish.rarity];
              const variantsCount = rec?.variantsDiscovered?.length || 0;

              return (
                <div
                  key={fish.id}
                  onClick={() => {
                    if (isDiscovered) setInspectFish(fish);
                  }}
                  className={`p-3 rounded-2xl border text-center transition-all ${
                    isDiscovered
                      ? 'bg-slate-800/80 border-slate-700 hover:border-emerald-500/70 hover:shadow-lg cursor-pointer'
                      : 'bg-slate-950/60 border-slate-800/60 opacity-60'
                  }`}
                >
                  {/* Fish Preview */}
                  <div className="h-20 flex items-center justify-center my-1 relative">
                    <FishRenderer
                      species={fish}
                      isSilhouette={!isDiscovered}
                      size={100}
                      animate={isDiscovered}
                    />
                  </div>

                  {/* Fish Information */}
                  <div className="mt-1">
                    <h3 className="font-extrabold text-xs text-white truncate">
                      {isDiscovered ? fish.name : 'Unknown Specimen'}
                    </h3>
                    <div className="flex flex-wrap items-center justify-center gap-1 mt-1">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${rarityInfo.bgBadge}`}>
                        {isDiscovered ? fish.rarity : '???'}
                      </span>
                      {fish.minRodLevel && fish.minRodLevel > 1 && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-amber-950/70 text-amber-300 border border-amber-800/60" title={`Requires ${ROD_TIERS[fish.minRodLevel - 1]?.name}`}>
                          🎣 Rod Lv.{fish.minRodLevel}+
                        </span>
                      )}
                    </div>

                    {isDiscovered ? (
                      <div className="mt-2 pt-2 border-t border-slate-700/60 text-[10px] text-slate-300 flex items-center justify-between">
                        <span className="flex items-center gap-1 text-amber-300 font-mono">
                          <Trophy className="w-3 h-3 text-amber-400" /> {rec.maxSize}cm
                        </span>
                        <span className="text-purple-300 font-bold">
                          {variantsCount}/9 ✨
                        </span>
                      </div>
                    ) : (
                      <div className="mt-2 pt-2 border-t border-slate-800 text-[10px] text-slate-500">
                        {fish.minRodLevel && fish.minRodLevel > 1 ? `Requires Rod Lv.${fish.minRodLevel}` : 'Undiscovered'}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Detailed Specimen Modal (When clicking a discovered fish) */}
        {inspectFish && (
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md z-20 flex items-center justify-center p-4">
            <div className="relative w-full max-w-md rounded-3xl p-5 bg-slate-900 border border-slate-700 shadow-2xl">
              <button
                onClick={() => setInspectFish(null)}
                className="absolute top-4 right-4 p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="text-center">
                <span className={`px-3 py-0.5 rounded-full text-xs font-bold border ${RARITY_CONFIG[inspectFish.rarity].bgBadge}`}>
                  {inspectFish.rarity}
                </span>
                <h3 className="text-xl font-black text-white mt-1">
                  {inspectFish.name}
                </h3>
                <p className="text-xs text-slate-400 italic">
                  {inspectFish.scientificName}
                </p>

                <div className="py-3 flex items-center justify-center">
                  <FishRenderer species={inspectFish} size={150} animate={true} />
                </div>

                <p className="text-xs text-slate-300 bg-slate-800/60 p-3 rounded-2xl border border-slate-700/60 mb-3">
                  "{inspectFish.description}"
                </p>

                <div className="grid grid-cols-3 gap-2 text-[11px] mb-3">
                  <div className="p-2 rounded-xl bg-slate-800/80">
                    <span className="text-slate-400 block text-[10px]">Record Size</span>
                    <span className="font-extrabold text-amber-300 font-mono">
                      {discoveries[inspectFish.id]?.maxSize || inspectFish.minSize} cm
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-800/80">
                    <span className="text-slate-400 block text-[10px]">Caught</span>
                    <span className="font-extrabold text-slate-200 font-mono">
                      {discoveries[inspectFish.id]?.timesCaught || 1}x
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-800/80">
                    <span className="text-slate-400 block text-[10px]">Base Value</span>
                    <span className="font-extrabold text-amber-400 font-mono">
                      🪙 {inspectFish.basePrice}
                    </span>
                  </div>
                </div>

                {/* Discovered Variants */}
                <div>
                  <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 text-left">
                    Discovered Variants ({discoveries[inspectFish.id]?.variantsDiscovered?.length || 0} / 9):
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.keys(FISH_VARIANTS).map((varKey) => {
                      const v = varKey as FishVariant;
                      const hasDiscovered = discoveries[inspectFish.id]?.variantsDiscovered?.includes(v);
                      const vData = FISH_VARIANTS[v];

                      return (
                        <span
                          key={v}
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${
                            hasDiscovered
                              ? 'bg-purple-950/80 text-purple-200 border-purple-500'
                              : 'bg-slate-900 text-slate-600 border-slate-800'
                          }`}
                        >
                          {hasDiscovered ? `✨ ${v}` : `? ${v}`}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
