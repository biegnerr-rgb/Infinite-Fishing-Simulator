import React from 'react';
import { LocationDef, ActiveEvent } from '../types/game';
import { Volume2, VolumeX, Sparkles, MapPin, Settings as SettingsIcon, BookOpen, Award, Compass, RefreshCw, Shirt } from 'lucide-react';

interface TopBarProps {
  coins: number;
  starPearls: number;
  currentLocation: LocationDef;
  activeEvents: ActiveEvent[];
  soundEnabled: boolean;
  onToggleSound: () => void;
  onOpenLocations: () => void;
  onOpenEncyclopedia: () => void;
  onOpenAchievements: () => void;
  onOpenPrestige: () => void;
  onOpenWardrobe: () => void;
  onOpenSettings: () => void;
  onOpenMerchant?: () => void;
  onOpenVisitors?: () => void;
  onOpenStoryJournal?: () => void;
  onOpenShipyard?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  coins,
  starPearls,
  currentLocation,
  activeEvents,
  soundEnabled,
  onToggleSound,
  onOpenLocations,
  onOpenEncyclopedia,
  onOpenAchievements,
  onOpenPrestige,
  onOpenWardrobe,
  onOpenSettings,
  onOpenMerchant,
  onOpenVisitors,
  onOpenStoryJournal,
  onOpenShipyard,
}) => {
  const merchantEvent = activeEvents.find(e => e.event.bonusType === 'traveling_merchant');

  return (
    <header className="w-full bg-slate-900/90 backdrop-blur-md border-b border-slate-800 text-white px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 select-none z-30">
      {/* Title & Location Badge */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-xl shadow-md shadow-emerald-950">
            🎣
          </div>
          <div>
            <h1 className="font-extrabold text-base tracking-tight text-white flex items-center gap-1.5 leading-none">
              <span>INFINITE FISHING POND</span>
            </h1>
            <span className="text-[11px] text-emerald-400 font-medium">Cozy Idle Waters</span>
          </div>
        </div>

        {/* Current Location Pill */}
        <button
          onClick={onOpenLocations}
          className="ml-2 flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-xs font-semibold text-slate-200 transition-colors shadow-sm cursor-pointer"
          title="Change fishing location"
        >
          <MapPin className="w-3.5 h-3.5 text-emerald-400" />
          <span>{currentLocation.name}</span>
          <span className="text-[10px] text-slate-400 uppercase tracking-wider ml-1">Change</span>
        </button>
      </div>

      {/* Active Events Carousel */}
      <div className="flex items-center gap-2 overflow-x-auto max-w-full py-1">
        {activeEvents.map(ae => (
          <div
            key={ae.event.id}
            onClick={() => {
              if (ae.event.bonusType === 'traveling_merchant' && onOpenMerchant) {
                onOpenMerchant();
              }
            }}
            className={`flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-semibold shadow-sm animate-pulse ${
              ae.event.bonusType === 'traveling_merchant'
                ? 'bg-amber-950/80 border-amber-500/80 text-amber-200 cursor-pointer hover:bg-amber-900'
                : 'bg-slate-800/90 border-slate-700 text-slate-200'
            }`}
          >
            <span>{ae.event.icon}</span>
            <span className="font-bold">{ae.event.name}</span>
            <span className="text-[11px] text-amber-300 font-mono">
              {Math.ceil(ae.timeRemaining)}s
            </span>
          </div>
        ))}
      </div>

      {/* Currencies & Navigation Buttons */}
      <div className="flex items-center gap-2.5">
        {/* Coins Readout */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-950/50 border border-amber-600/40 text-amber-300 font-extrabold text-sm tracking-wide shadow-inner">
          <span className="text-base">🪙</span>
          <span className="font-mono tabular-nums">{coins.toLocaleString()}</span>
        </div>

        {/* Star Pearls Readout (Prestige Currency) */}
        <div 
          onClick={onOpenPrestige}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-950/50 hover:bg-purple-900/50 border border-purple-600/40 text-purple-300 font-extrabold text-sm tracking-wide cursor-pointer transition-colors"
          title="Star Pearls (Mystic Ascension Currency)"
        >
          <span className="text-base">🔮</span>
          <span className="font-mono tabular-nums">{starPearls.toLocaleString()}</span>
        </div>

        {/* Story Journal Button */}
        {onOpenStoryJournal && (
          <button
            onClick={onOpenStoryJournal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-600/30 to-amber-500/20 hover:from-amber-600/40 hover:to-amber-500/30 border border-amber-500/50 text-amber-200 font-extrabold text-xs tracking-wide transition-all shadow-sm cursor-pointer active:scale-95"
            title="Secrets of the Infinite Pond (Story Journal & Grandfather's Log)"
          >
            <span className="text-sm">📖</span>
            <span className="hidden sm:inline">Story Journal</span>
          </button>
        )}

        {/* Shipyard Button */}
        {onOpenShipyard && (
          <button
            onClick={onOpenShipyard}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600/30 to-blue-500/20 hover:from-cyan-600/40 hover:to-blue-500/30 border border-cyan-500/50 text-cyan-200 font-extrabold text-xs tracking-wide transition-all shadow-sm cursor-pointer active:scale-95"
            title="Pond Shipyard (Upgrade from Wooden Dinghy to Mega Yacht)"
          >
            <span className="text-sm">⚓</span>
            <span className="hidden sm:inline">Shipyard</span>
          </button>
        )}

        {/* Quick Modal Nav Icons */}
        <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700/80">
          <button
            onClick={onOpenEncyclopedia}
            className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            title="Fish Encyclopedia & Log"
          >
            <BookOpen className="w-4 h-4" />
          </button>
          {onOpenVisitors && (
            <button
              onClick={onOpenVisitors}
              className="p-1.5 rounded-lg hover:bg-slate-700 text-amber-300 hover:text-amber-100 transition-colors flex items-center justify-center text-xs"
              title="Pond Sanctuary & Little Visitors"
            >
              🐾
            </button>
          )}
          <button
            onClick={onOpenWardrobe}
            className="p-1.5 rounded-lg hover:bg-slate-700 text-amber-300 hover:text-amber-100 transition-colors"
            title="Fisherman Wardrobe & Outfits"
          >
            <Shirt className="w-4 h-4" />
          </button>
          <button
            onClick={onOpenAchievements}
            className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            title="Milestones & Achievements"
          >
            <Award className="w-4 h-4" />
          </button>
          <button
            onClick={onOpenPrestige}
            className="p-1.5 rounded-lg hover:bg-slate-700 text-purple-300 hover:text-purple-100 transition-colors"
            title="Cosmic Ascension (Prestige)"
          >
            <Sparkles className="w-4 h-4" />
          </button>
          <button
            onClick={onToggleSound}
            className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            title={soundEnabled ? 'Mute Sounds' : 'Unmute Sounds'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
          </button>
          <button
            onClick={onOpenSettings}
            className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            title="Settings & Saves"
          >
            <SettingsIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
