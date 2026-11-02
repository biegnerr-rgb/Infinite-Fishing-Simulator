import React, { useState } from 'react';
import {
  FishermanCustomization,
  HATS,
  OUTFITS,
  HAIR_STYLES,
  FACIAL_HAIR_STYLES,
  SKIN_TONES,
  CosmeticItem,
} from '../data/cosmeticsData';
import { X, Sparkles, Check, Lock, Palette, ShoppingBag, Shirt, Edit3 } from 'lucide-react';
import { sound } from '../utils/audio';

interface WardrobeModalProps {
  customization: FishermanCustomization;
  coins: number;
  starPearls: number;
  onUpdateCustomization: (newCustomization: FishermanCustomization) => void;
  onUnlockCosmetic: (itemId: string, costCoins: number, costPearls: number) => void;
  onClose: () => void;
}

export const WardrobeModal: React.FC<WardrobeModalProps> = ({
  customization,
  coins,
  starPearls,
  onUpdateCustomization,
  onUnlockCosmetic,
  onClose,
}) => {
  const [activeCategory, setActiveCategory] = useState<'hat' | 'outfit' | 'hair' | 'facialHair' | 'skin' | 'halloween'>('halloween');
  const [fishermanName, setFishermanName] = useState<string>(customization.name || 'Old Pete');
  const [preview, setPreview] = useState<FishermanCustomization>(customization);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.slice(0, 18);
    setFishermanName(val);
    onUpdateCustomization({ ...customization, name: val || 'Angler' });
  };

  const getItemsForCategory = (): CosmeticItem[] => {
    if (activeCategory === 'halloween') {
      return [
        ...HATS.filter(h => h.isHalloween),
        ...OUTFITS.filter(o => o.isHalloween),
        ...SKIN_TONES.filter(s => s.isHalloween),
        ...HAIR_STYLES.filter(h => h.isHalloween),
        ...FACIAL_HAIR_STYLES.filter(f => f.isHalloween),
      ];
    }
    switch (activeCategory) {
      case 'hat': return HATS;
      case 'outfit': return OUTFITS;
      case 'skin': return SKIN_TONES;
      case 'hair': return HAIR_STYLES;
      case 'facialHair': return FACIAL_HAIR_STYLES;
    }
  };

  const currentItems = getItemsForCategory();

  const handleSelect = (item: CosmeticItem) => {
    const isUnlocked = customization.unlockedCosmeticIds.includes(item.id) || item.unlockedByDefault;

    // Update preview
    setPreview(prev => {
      const next = { ...prev };
      if (item.type === 'hat') next.hatId = item.id;
      if (item.type === 'outfit') next.outfitId = item.id;
      if (item.type === 'skin') next.skinId = item.id;
      if (item.type === 'hair') next.hairId = item.id;
      if (item.type === 'facialHair') next.facialHairId = item.id;
      return next;
    });

    if (isUnlocked) {
      const nextCustom = { ...customization };
      if (item.type === 'hat') nextCustom.hatId = item.id;
      if (item.type === 'outfit') nextCustom.outfitId = item.id;
      if (item.type === 'skin') nextCustom.skinId = item.id;
      if (item.type === 'hair') nextCustom.hairId = item.id;
      if (item.type === 'facialHair') nextCustom.facialHairId = item.id;
      onUpdateCustomization(nextCustom);
      sound.playUpgrade();
    }
  };

  const handleBuy = (item: CosmeticItem) => {
    if (coins >= item.costCoins && starPearls >= item.costPearls) {
      onUnlockCosmetic(item.id, item.costCoins, item.costPearls);
      sound.playChest();
      const nextCustom = { ...customization, unlockedCosmeticIds: [...customization.unlockedCosmeticIds, item.id] };
      if (item.type === 'hat') nextCustom.hatId = item.id;
      if (item.type === 'outfit') nextCustom.outfitId = item.id;
      if (item.type === 'skin') nextCustom.skinId = item.id;
      if (item.type === 'hair') nextCustom.hairId = item.id;
      if (item.type === 'facialHair') nextCustom.facialHairId = item.id;
      onUpdateCustomization(nextCustom);
    }
  };

  const activeSkin = SKIN_TONES.find(s => s.id === preview.skinId) || SKIN_TONES[0];
  const activeHair = HAIR_STYLES.find(h => h.id === preview.hairId) || HAIR_STYLES[0];
  const activeFacialHair = FACIAL_HAIR_STYLES.find(f => f.id === preview.facialHairId) || FACIAL_HAIR_STYLES[0];
  const activeHat = HATS.find(h => h.id === preview.hatId) || HATS[0];
  const activeOutfit = OUTFITS.find(o => o.id === preview.outfitId) || OUTFITS[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md select-none text-white animate-fade-in">
      <div className="relative w-full max-w-4xl h-[90vh] flex flex-col rounded-3xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-600 to-orange-500 flex items-center justify-center text-xl shadow-md">
              🎃
            </div>
            <div>
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                <span>The Dockside Wardrobe & Costumes</span>
              </h2>
              <p className="text-xs text-slate-400">
                Name your fisherman and suit up with cozy tackle or spooky Halloween costumes!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-950/60 border border-amber-600/40 text-amber-300 font-bold text-xs">
              <span>🪙</span>
              <span className="font-mono">{coins.toLocaleString()}</span>
            </div>
            {starPearls > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple-950/60 border border-purple-600/40 text-purple-300 font-bold text-xs">
                <span>🔮</span>
                <span className="font-mono">{starPearls}</span>
              </div>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Body */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          
          {/* Left: Fisherman Character Preview + Name Field */}
          <div className="w-full md:w-72 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 border-b md:border-b-0 md:border-r border-slate-800 p-5 flex flex-col items-center justify-center relative">
            
            {/* Fisherman Name Input Field */}
            <div className="w-full mb-3">
              <label className="text-[10px] font-black text-amber-400 uppercase tracking-widest flex items-center gap-1 mb-1 justify-center">
                <Edit3 className="w-3 h-3" /> Fisherman's Name
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={fishermanName}
                  onChange={handleNameChange}
                  placeholder="Name your fisherman..."
                  maxLength={18}
                  className="w-full text-center bg-slate-950/90 border border-amber-500/40 focus:border-amber-400 rounded-xl px-3 py-1.5 text-sm font-black text-amber-200 placeholder-slate-600 outline-none shadow-inner"
                />
              </div>
            </div>

            {/* Fisherman Avatar Preview */}
            <div className="relative w-48 h-52 flex items-center justify-center">
              <svg viewBox="0 0 160 200" width="160" height="200" className="drop-shadow-2xl overflow-visible">
                {/* Pier */}
                <rect x="15" y="155" width="130" height="14" fill="#78350f" rx="3" stroke="#451a03" strokeWidth="2" />
                <rect x="25" y="169" width="16" height="30" fill="#451a03" />
                <rect x="115" y="169" width="16" height="30" fill="#451a03" />

                {/* Boots */}
                <rect x="52" y="142" width="18" height="16" fill="#1e293b" rx="4" />
                <rect x="78" y="142" width="18" height="16" fill="#1e293b" rx="4" />

                {/* Pants */}
                <rect x="54" y="115" width="14" height="30" fill={activeOutfit.color} rx="3" />
                <rect x="80" y="115" width="14" height="30" fill={activeOutfit.color} rx="3" />

                {/* Torso */}
                <rect x="48" y="70" width="52" height="50" fill={activeOutfit.color} rx="8" />
                <rect x="62" y="72" width="24" height="42" fill={activeOutfit.accentColor || '#dc2626'} rx="4" />

                {/* Skeleton Costume Bone Print */}
                {activeOutfit.id === 'outfit_skeleton' && (
                  <g stroke="#86efac" strokeWidth="2" strokeLinecap="round">
                    <line x1="68" y1="80" x2="80" y2="80" />
                    <line x1="66" y1="88" x2="82" y2="88" />
                    <line x1="68" y1="96" x2="80" y2="96" />
                    <line x1="74" y1="76" x2="74" y2="105" />
                  </g>
                )}

                {/* Arms */}
                <path d="M 48 76 Q 38 100 52 110" stroke={activeOutfit.color} strokeWidth="10" strokeLinecap="round" fill="none" />
                <path d="M 100 76 Q 115 95 106 112" stroke={activeOutfit.color} strokeWidth="10" strokeLinecap="round" fill="none" />
                <circle cx="53" cy="110" r="5" fill={activeSkin.color} />
                <circle cx="106" cy="112" r="5" fill={activeSkin.color} />

                {/* Fishing Rod */}
                <line x1="88" y1="130" x2="148" y2="35" stroke="#78350f" strokeWidth="3.5" strokeLinecap="round" />
                <circle cx="148" cy="35" r="2.5" fill="#f59e0b" />
                <path d="M 148 35 Q 155 90 152 145" stroke="rgba(255, 255, 255, 0.7)" strokeWidth="1.2" fill="none" />

                {/* Neck & Head */}
                <rect x="68" y="60" width="12" height="14" fill={activeSkin.color} rx="2" />
                <ellipse cx="74" cy="50" rx="16" ry="17" fill={activeSkin.color} />

                {/* Facial Hair */}
                {activeFacialHair.id !== 'beard_clean' && (
                  <path
                    d="M 62 52 Q 74 69 86 52 Q 82 72 74 72 Q 66 72 62 52 Z"
                    fill={activeFacialHair.color}
                  />
                )}

                {/* Eyes & Smile */}
                <circle cx="68" cy="48" r="2" fill="#0f172a" />
                <circle cx="80" cy="48" r="2" fill="#0f172a" />
                <path d="M 70 56 Q 74 59 78 56" stroke="#0f172a" strokeWidth="1.5" strokeLinecap="round" fill="none" />

                {/* Hair */}
                <path
                  d="M 58 48 C 56 32 92 32 90 48 C 86 36 62 36 58 48 Z"
                  fill={activeHair.color}
                />

                {/* Hats & Halloween Masks */}
                {activeHat.id === 'hat_straw' && (
                  <g>
                    <ellipse cx="74" cy="35" rx="28" ry="7" fill="#fde047" stroke="#ca8a04" strokeWidth="1.5" />
                    <path d="M 60 35 C 60 20 88 20 88 35 Z" fill="#facc15" stroke="#ca8a04" strokeWidth="1.5" />
                  </g>
                )}

                {activeHat.id === 'hat_pumpkin' && (
                  <g>
                    {/* Glowing Jack-o-Lantern Mask */}
                    <ellipse cx="74" cy="46" rx="20" ry="21" fill="#ea580c" stroke="#9a3412" strokeWidth="2" />
                    <rect x="72" y="22" width="4" height="6" fill="#15803d" rx="1" />
                    {/* Carved glowing eyes & mouth */}
                    <polygon points="65,42 70,42 67,37" fill="#fef08a" />
                    <polygon points="78,42 83,42 81,37" fill="#fef08a" />
                    <path d="M 66 52 L 70 55 L 74 52 L 78 55 L 82 52" stroke="#fef08a" strokeWidth="2.5" fill="none" />
                  </g>
                )}

                {activeHat.id === 'hat_witch' && (
                  <g>
                    <ellipse cx="74" cy="36" rx="28" ry="6" fill="#2e1065" stroke="#172554" strokeWidth="1.5" />
                    <path d="M 63 36 L 85 36 L 80 12 L 87 6 Z" fill="#3b0764" />
                    <rect x="63" y="33" width="22" height="3" fill="#a855f7" />
                  </g>
                )}

                {activeHat.id === 'hat_skeleton' && (
                  <g>
                    <ellipse cx="74" cy="46" rx="18" ry="19" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1.5" />
                    <circle cx="68" cy="44" r="4.5" fill="#020617" />
                    <circle cx="80" cy="44" r="4.5" fill="#020617" />
                    <circle cx="68" cy="44" r="2" fill="#4ade80" />
                    <circle cx="80" cy="44" r="2" fill="#4ade80" />
                    <line x1="68" y1="56" x2="80" y2="56" stroke="#020617" strokeWidth="2" />
                  </g>
                )}

                {activeHat.id === 'hat_vampire' && (
                  <g>
                    <ellipse cx="74" cy="36" rx="24" ry="5" fill="#0f172a" />
                    <polygon points="62,35 68,22 74,32 80,22 86,35" fill="#0f172a" stroke="#dc2626" strokeWidth="1.5" />
                    <circle cx="74" cy="29" r="2.5" fill="#dc2626" />
                  </g>
                )}

                {activeHat.id === 'hat_ghost' && (
                  <g>
                    <path d="M 52 64 C 52 28 96 28 96 64 C 92 68 84 62 74 68 C 64 62 56 68 52 64 Z" fill="#f8fafc" stroke="#cbd5e1" strokeWidth="1.5" />
                    <circle cx="66" cy="46" r="4" fill="#09090b" />
                    <circle cx="82" cy="46" r="4" fill="#09090b" />
                  </g>
                )}

                {activeHat.id === 'hat_crown' && (
                  <polygon points="56,36 60,22 67,30 74,18 81,30 88,22 92,36" fill="#fbbf24" stroke="#d97706" strokeWidth="1.5" />
                )}

                {activeHat.id === 'hat_diver' && (
                  <g>
                    <ellipse cx="74" cy="46" rx="20" ry="22" fill="#b45309" stroke="#78350f" strokeWidth="2" />
                    <circle cx="74" cy="46" r="10" fill="#38bdf8" opacity="0.8" stroke="#f59e0b" strokeWidth="2" />
                  </g>
                )}

                {activeHat.id === 'hat_bucket' && (
                  <g>
                    <ellipse cx="74" cy="37" rx="25" ry="6" fill="#15803d" stroke="#14532d" strokeWidth="1.5" />
                    <path d="M 62 37 C 62 25 86 25 86 37 Z" fill="#16a34a" stroke="#14532d" strokeWidth="1.5" />
                  </g>
                )}

                {activeHat.id === 'hat_beanie' && (
                  <g>
                    <path d="M 59 40 C 58 22 90 22 89 40 Z" fill="#ea580c" stroke="#c2410c" strokeWidth="1.5" />
                    <circle cx="74" cy="22" r="4" fill="#fb923c" />
                  </g>
                )}
              </svg>
            </div>

            <div className="mt-2 text-center">
              <span className="font-black text-sm text-amber-300 block truncate max-w-[200px]">
                {fishermanName || 'Angler Pete'}
              </span>
              <span className="text-[11px] text-slate-400">
                {activeOutfit.name}
              </span>
            </div>
          </div>

          {/* Right: Customization Category Tabs & Catalog */}
          <div className="flex-1 flex flex-col overflow-hidden bg-slate-900/60">
            
            {/* Category Navigation Tabs */}
            <div className="p-3 border-b border-slate-800 flex items-center gap-1.5 overflow-x-auto text-xs font-bold">
              <button
                onClick={() => setActiveCategory('halloween')}
                className={`px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 animate-pulse ${
                  activeCategory === 'halloween'
                    ? 'bg-gradient-to-r from-orange-600 to-amber-500 text-slate-950 font-black shadow-lg shadow-orange-950/60'
                    : 'bg-orange-950/60 text-orange-300 border border-orange-700/60 hover:bg-orange-900/70'
                }`}
              >
                <span>🎃 Halloween Shop</span>
              </button>
              <button
                onClick={() => setActiveCategory('hat')}
                className={`px-3 py-2 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
                  activeCategory === 'hat'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <span>👒 Hats</span>
              </button>
              <button
                onClick={() => setActiveCategory('outfit')}
                className={`px-3 py-2 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
                  activeCategory === 'outfit'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <span>🧥 Outfits</span>
              </button>
              <button
                onClick={() => setActiveCategory('hair')}
                className={`px-3 py-2 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
                  activeCategory === 'hair'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <span>✂️ Hair</span>
              </button>
              <button
                onClick={() => setActiveCategory('facialHair')}
                className={`px-3 py-2 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
                  activeCategory === 'facialHair'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <span>🧔 Beards</span>
              </button>
              <button
                onClick={() => setActiveCategory('skin')}
                className={`px-3 py-2 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
                  activeCategory === 'skin'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <span>🎨 Complexion</span>
              </button>
            </div>

            {/* Items Grid */}
            <div className="flex-1 p-4 overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {currentItems.map(item => {
                  const isUnlocked = customization.unlockedCosmeticIds.includes(item.id) || item.unlockedByDefault;
                  const isEquipped = 
                    (item.type === 'hat' && customization.hatId === item.id) ||
                    (item.type === 'outfit' && customization.outfitId === item.id) ||
                    (item.type === 'skin' && customization.skinId === item.id) ||
                    (item.type === 'hair' && customization.hairId === item.id) ||
                    (item.type === 'facialHair' && customization.facialHairId === item.id);

                  const canAfford = coins >= item.costCoins && starPearls >= item.costPearls;

                  return (
                    <div
                      key={item.id}
                      onClick={() => handleSelect(item)}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                        item.isHalloween ? 'border-orange-500/50' : ''
                      } ${
                        isEquipped
                          ? 'bg-amber-950/30 border-amber-500 shadow-lg ring-1 ring-amber-500/40'
                          : isUnlocked
                          ? 'bg-slate-800/70 border-slate-700 hover:border-slate-500'
                          : 'bg-slate-950/60 border-slate-800/80 opacity-80'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-10 h-10 rounded-xl border flex items-center justify-center text-xl shrink-0 ${
                            item.isHalloween ? 'bg-orange-950/60 border-orange-500/60 text-2xl' : 'bg-slate-800 border-slate-700'
                          }`}>
                            {item.icon}
                          </div>
                          <div>
                            <div className="font-extrabold text-xs text-white flex items-center gap-1.5">
                              <span>{item.name}</span>
                              {item.isHalloween && (
                                <span className="px-1.5 py-0.2 rounded bg-orange-600 text-slate-950 text-[9px] font-black">
                                  HALLOWEEN
                                </span>
                              )}
                              {isEquipped && (
                                <span className="px-1.5 py-0.2 rounded bg-amber-500 text-slate-950 text-[10px] font-black">
                                  EQUIPPED
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                              {item.description}
                            </p>
                          </div>
                        </div>

                        {/* Action: Equip or Buy */}
                        {isUnlocked ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelect(item);
                            }}
                            className={`px-3 py-1.5 rounded-xl font-extrabold text-xs shrink-0 cursor-pointer ${
                              isEquipped
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-700'
                                : 'bg-slate-700 hover:bg-slate-600 text-white'
                            }`}
                          >
                            {isEquipped ? 'Active' : 'Wear'}
                          </button>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (canAfford) handleBuy(item);
                            }}
                            disabled={!canAfford}
                            className={`px-3 py-1.5 rounded-xl font-black text-xs shrink-0 flex items-center gap-1 transition-transform cursor-pointer ${
                              canAfford
                                ? 'bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 text-amber-950 shadow-md active:scale-95'
                                : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                            }`}
                          >
                            <Lock className="w-3 h-3" />
                            {item.costCoins > 0 && <span>🪙 {item.costCoins.toLocaleString()}</span>}
                            {item.costPearls > 0 && <span>🔮 {item.costPearls}</span>}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
