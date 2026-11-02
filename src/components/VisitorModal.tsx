import React, { useState } from 'react';
import { VisitorType, BefriendedVisitor } from '../types/game';
import { VISITORS_CONFIG, VisitorSpeciesDef } from '../data/visitorsData';
import { sound } from '../utils/audio';

interface VisitorModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeVisitorType?: VisitorType | null;
  befriendedVisitors: Record<VisitorType, BefriendedVisitor>;
  onRenameVisitor: (type: VisitorType, newName: string) => void;
  onFeedVisitor: (type: VisitorType, foodName: string) => { coins: number; pearls: number; message: string };
  coins: number;
}

const FOOD_OPTIONS = [
  { name: 'Juicy Garden Worms 🪱', cost: 25, bonusFor: ['frog', 'crab'] },
  { name: 'Sun-Dried Pond Greens 🌿', cost: 30, bonusFor: ['turtle'] },
  { name: 'Toasted Breadcrumbs 🍞', cost: 20, bonusFor: ['duck'] },
  { name: 'Crispy Fresh Minnow 🐟', cost: 45, bonusFor: ['otter', 'raccoon'] },
  { name: 'Sweet Wild Marsh Berries 🫐', cost: 35, bonusFor: ['raccoon', 'duck'] },
];

export const VisitorModal: React.FC<VisitorModalProps> = ({
  isOpen,
  onClose,
  activeVisitorType,
  befriendedVisitors,
  onRenameVisitor,
  onFeedVisitor,
  coins,
}) => {
  const [selectedType, setSelectedType] = useState<VisitorType>(activeVisitorType || 'frog');
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [feedFeedback, setFeedFeedback] = useState<string | null>(null);
  const [rewardToast, setRewardToast] = useState<{ coins: number; pearls: number } | null>(null);

  if (!isOpen) return null;

  const currentVisitor = befriendedVisitors[selectedType];
  const config: VisitorSpeciesDef = VISITORS_CONFIG[selectedType];
  const isCurrentlyVisiting = activeVisitorType === selectedType;

  const handleStartRename = () => {
    setNameInput(currentVisitor.name);
    setEditingName(true);
  };

  const handleSaveRename = () => {
    const trimmed = nameInput.trim();
    if (trimmed) {
      onRenameVisitor(selectedType, trimmed);
    }
    setEditingName(false);
  };

  const handleFeed = (food: typeof FOOD_OPTIONS[0]) => {
    if (coins < food.cost) {
      setFeedFeedback("You don't have enough coins for this treat!");
      setTimeout(() => setFeedFeedback(null), 2500);
      return;
    }

    sound.playSplash();
    const result = onFeedVisitor(selectedType, food.name);

    setFeedFeedback(result.message);
    if (result.coins > 0 || result.pearls > 0) {
      setRewardToast({ coins: result.coins, pearls: result.pearls });
      sound.playCatch('Rare');
    }

    setTimeout(() => {
      setFeedFeedback(null);
      setRewardToast(null);
    }, 4500);
  };

  const getFriendshipRank = (friendship: number) => {
    if (friendship >= 100) return { title: 'Eternal Soul Bond ❤️‍🔥', level: 5 };
    if (friendship >= 75) return { title: 'Best Buddy 💖', level: 4 };
    if (friendship >= 50) return { title: 'Close Friend 💕', level: 3 };
    if (friendship >= 25) return { title: 'Friendly Pal 💛', level: 2 };
    return { title: 'Curious Acquaintance 🤍', level: 1 };
  };

  const rank = getFriendshipRank(currentVisitor?.friendship || 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in select-none">
      <div className="relative w-full max-w-2xl bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-2xl shadow-inner">
              🐾
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                Pond Sanctuary & Visitors
              </h2>
              <p className="text-xs text-slate-400">
                Befriend wild creatures that wander into the pond scene, feed them treats, and receive gifts!
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors text-lg"
          >
            ✕
          </button>
        </div>

        {/* Visitor Selector Tabs */}
        <div className="flex items-center gap-2 p-2 sm:px-4 bg-slate-950/60 border-b border-slate-800/60 overflow-x-auto no-scrollbar">
          {(Object.keys(VISITORS_CONFIG) as VisitorType[]).map(type => {
            const c = VISITORS_CONFIG[type];
            const v = befriendedVisitors[type];
            const isSelected = selectedType === type;
            const isVisiting = activeVisitorType === type;

            return (
              <button
                key={type}
                onClick={() => {
                  setSelectedType(type);
                  setEditingName(false);
                }}
                className={`relative px-3.5 py-2 rounded-2xl flex items-center gap-2 font-medium text-xs sm:text-sm transition-all whitespace-nowrap cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow-lg shadow-emerald-500/20 scale-[1.02]'
                    : 'bg-slate-800/70 hover:bg-slate-800 text-slate-300'
                }`}
              >
                <span className="text-base">{c.emoji}</span>
                <span>{v?.name || c.defaultName}</span>
                {isVisiting && (
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping absolute top-1.5 right-1.5" />
                )}
              </button>
            );
          })}
        </div>

        {/* Main Content Area */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          
          {/* Top Hero Card */}
          <div className={`p-4 sm:p-5 rounded-3xl bg-gradient-to-r ${config.avatarBg} text-white shadow-xl relative overflow-hidden border border-white/10`}>
            {/* Ambient Background decoration */}
            <div className="absolute -right-6 -bottom-6 text-9xl opacity-15 select-none pointer-events-none">
              {config.emoji}
            </div>

            <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 flex items-center justify-center text-4xl sm:text-5xl shadow-2xl animate-bounce">
                  {config.emoji}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    {editingName ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={nameInput}
                          onChange={e => setNameInput(e.target.value)}
                          maxLength={20}
                          className="px-2.5 py-1 text-sm bg-slate-900/90 text-white border border-white/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400"
                          placeholder="Visitor Name..."
                          autoFocus
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleSaveRename();
                            if (e.key === 'Escape') setEditingName(false);
                          }}
                        />
                        <button
                          onClick={handleSaveRename}
                          className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition-colors"
                        >
                          Save
                        </button>
                      </div>
                    ) : (
                      <>
                        <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                          {currentVisitor.name}
                        </h3>
                        <button
                          onClick={handleStartRename}
                          title="Rename this creature"
                          className="p-1 rounded-lg bg-white/15 hover:bg-white/30 text-white/90 text-xs transition-colors"
                        >
                          ✏️
                        </button>
                      </>
                    )}
                  </div>

                  <p className="text-xs text-white/80 font-medium">
                    {config.speciesTitle} • {config.personality}
                  </p>

                  <div className="mt-2 flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[11px] font-semibold backdrop-blur-sm">
                      {rank.title}
                    </span>
                    {isCurrentlyVisiting && (
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 text-[11px] font-bold animate-pulse shadow-md">
                        🌟 Visiting Pond Now!
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Friendship Hearts */}
              <div className="bg-black/30 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/10 self-stretch sm:self-auto flex flex-col justify-center">
                <div className="text-[11px] text-white/70 font-semibold mb-1 flex items-center justify-between gap-4">
                  <span>Friendship Meter</span>
                  <span className="text-white font-mono font-bold">{currentVisitor.friendship}/100</span>
                </div>
                <div className="w-full sm:w-36 h-2.5 bg-black/40 rounded-full overflow-hidden p-0.5">
                  <div
                    className="h-full bg-gradient-to-r from-rose-400 to-pink-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, currentVisitor.friendship)}%` }}
                  />
                </div>
                <div className="mt-1 flex gap-0.5 text-xs text-rose-300">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span key={i} className={i < rank.level ? 'opacity-100' : 'opacity-30'}>
                      ❤️
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Dialogue / Quote */}
          <div className="p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60 text-slate-200 text-xs sm:text-sm italic flex items-center gap-3">
            <span className="text-xl">💬</span>
            <span>"{config.greetingQuote}"</span>
          </div>

          {/* Feedback & Gift Reward Toast */}
          {feedFeedback && (
            <div className="p-3.5 rounded-2xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs sm:text-sm font-medium animate-fade-in flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">✨</span>
                <span>{feedFeedback}</span>
              </div>
              {rewardToast && (
                <div className="flex items-center gap-2 text-xs font-bold text-amber-300 bg-amber-950/60 px-2.5 py-1 rounded-xl border border-amber-500/40">
                  {rewardToast.coins > 0 && <span>+{rewardToast.coins.toLocaleString()} 🪙</span>}
                  {rewardToast.pearls > 0 && <span>+{rewardToast.pearls} 🔮</span>}
                </div>
              )}
            </div>
          )}

          {/* Feed Your Visitor Station */}
          <div className="p-4 sm:p-5 rounded-3xl bg-slate-900/90 border border-slate-800/80 shadow-lg space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>🍽️ Feed a Delicious Snack</span>
                </h4>
                <p className="text-xs text-slate-400">
                  {config.defaultName}'s favorite: <strong className="text-amber-300">{config.favoriteFood}</strong>
                </p>
              </div>
              <div className="text-xs text-slate-400">
                Times Fed: <strong className="text-white">{currentVisitor.timesFed}</strong>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              {FOOD_OPTIONS.map(food => {
                const isFavorite = food.bonusFor.includes(selectedType);
                const canAfford = coins >= food.cost;

                return (
                  <button
                    key={food.name}
                    onClick={() => handleFeed(food)}
                    className={`p-3 rounded-2xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                      isFavorite
                        ? 'bg-amber-950/30 hover:bg-amber-900/40 border-amber-500/40 hover:border-amber-400'
                        : 'bg-slate-800/50 hover:bg-slate-800 border-slate-700/50'
                    }`}
                  >
                    <div>
                      <div className="text-xs sm:text-sm font-semibold text-slate-100 flex items-center gap-1.5">
                        <span>{food.name}</span>
                        {isFavorite && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            Favorite!
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Cost: <span className={canAfford ? 'text-amber-400 font-mono' : 'text-rose-400 font-mono'}>{food.cost} coins</span>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30 hover:bg-emerald-500 hover:text-slate-950 transition-colors">
                      Feed
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Creature Lore & Gift Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/60 space-y-1">
              <h5 className="font-bold text-slate-300 flex items-center gap-1.5">
                <span>📖 Visitor Lore</span>
              </h5>
              <p className="text-slate-400 leading-relaxed">
                {config.lore}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/60 space-y-1">
              <h5 className="font-bold text-slate-300 flex items-center gap-1.5">
                <span>🎁 Special Gifts & Trinkets</span>
              </h5>
              <p className="text-slate-400 leading-relaxed">
                Gives gifts of <strong className="text-amber-300">{config.baseGift.minCoins} - {config.baseGift.maxCoins} coins</strong>, with chances for <strong className="text-purple-300">Star Pearls</strong> and <strong className="text-emerald-300">{config.baseGift.specialItemName}</strong>! Total gifts given: <strong className="text-white">{currentVisitor.giftsGiven}</strong>.
              </p>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-900/50 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            Current Coins: <strong className="text-amber-400 font-mono font-bold">{coins.toLocaleString()} 🪙</strong>
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs sm:text-sm transition-colors cursor-pointer"
          >
            Close Sanctuary
          </button>
        </div>

      </div>
    </div>
  );
};
