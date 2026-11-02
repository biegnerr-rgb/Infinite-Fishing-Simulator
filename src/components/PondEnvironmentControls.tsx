import React from 'react';
import { TimeOfDay, WeatherType, SeasonType, PondZone, VisitorType } from '../types/game';
import { VISITORS_CONFIG } from '../data/visitorsData';

interface PondEnvironmentControlsProps {
  timeOfDay: TimeOfDay;
  weather: WeatherType;
  season: SeasonType;
  autoCycle: boolean;
  selectedZone: PondZone;
  activeVisitorType?: VisitorType | null;
  visitorName?: string;
  onTimeChange: (time: TimeOfDay) => void;
  onWeatherToggle: () => void;
  onSeasonChange: (season: SeasonType) => void;
  onAutoCycleToggle: () => void;
  onSelectZone: (zone: PondZone) => void;
  onOpenVisitorModal: () => void;
}

const TIME_CONFIG: Record<TimeOfDay, { label: string; icon: string; bonus: string }> = {
  dawn: { label: 'Sunrise', icon: '🌅', bonus: 'Twilight Species (+35% Gold)' },
  day: { label: 'Daytime', icon: '☀️', bonus: 'Sunlit Species & Shallows' },
  dusk: { label: 'Sunset', icon: '🌇', bonus: 'Twilight Species & Bass' },
  night: { label: 'Nighttime', icon: '🌙', bonus: 'Fireflies & Nocturnal Fish' },
};

const SEASON_CONFIG: Record<SeasonType, { label: string; icon: string; bonus: string }> = {
  spring: { label: 'Spring', icon: '🌸', bonus: 'Newborn Fry & Fast Nibbles' },
  summer: { label: 'Summer', icon: '☀️', bonus: 'Warm Waters & Giant Fish' },
  autumn: { label: 'Autumn', icon: '🍂', bonus: 'Golden Mist & Stardust' },
  winter: { label: 'Winter', icon: '❄️', bonus: 'Pond Freezes! Ice-Fishing Species' },
};

const ZONE_CONFIG: Record<PondZone, { label: string; icon: string; description: string }> = {
  lily_pads: { label: 'Lily Pads', icon: '🪷', description: 'Surface fish, minnows & hidden pearl gifts' },
  deep_water: { label: 'Deep Abyss', icon: '🌊', description: 'Apex titans, sharks, whales & megalodons' },
  rocks_reef: { label: 'Rocks & Reef', icon: '🪨', description: 'Crustaceans, bottom dwellers & ancient relics' },
  reeds: { label: 'Reeds & Shallows', icon: '🌿', description: 'Ambush predators, pike, catfish & tackle' },
};

export const PondEnvironmentControls: React.FC<PondEnvironmentControlsProps> = ({
  timeOfDay,
  weather,
  season,
  autoCycle,
  selectedZone,
  activeVisitorType,
  visitorName,
  onTimeChange,
  onWeatherToggle,
  onSeasonChange,
  onAutoCycleToggle,
  onSelectZone,
  onOpenVisitorModal,
}) => {
  const times: TimeOfDay[] = ['dawn', 'day', 'dusk', 'night'];
  const seasons: SeasonType[] = ['spring', 'summer', 'autumn', 'winter'];
  const zones: PondZone[] = ['lily_pads', 'deep_water', 'rocks_reef', 'reeds'];

  const cycleTime = () => {
    const nextIdx = (times.indexOf(timeOfDay) + 1) % times.length;
    onTimeChange(times[nextIdx]);
  };

  const cycleSeason = () => {
    const nextIdx = (seasons.indexOf(season) + 1) % seasons.length;
    onSeasonChange(seasons[nextIdx]);
  };

  return (
    <div className="w-full flex flex-wrap items-center justify-between gap-2.5 px-3.5 py-2.5 rounded-2xl bg-slate-900/90 border border-slate-800 backdrop-blur-md shadow-xl text-xs select-none">
      
      {/* Left: Time, Weather & Season Controls */}
      <div className="flex flex-wrap items-center gap-2">
        
        {/* Time of Day Pill */}
        <button
          onClick={cycleTime}
          title={`Click to switch Time of Day (Bonus: ${TIME_CONFIG[timeOfDay].bonus})`}
          className="px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700/60 text-slate-200 font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95"
        >
          <span className="text-sm">{TIME_CONFIG[timeOfDay].icon}</span>
          <span>{TIME_CONFIG[timeOfDay].label}</span>
          <span className="text-[10px] text-slate-400 font-normal hidden sm:inline">
            ({TIME_CONFIG[timeOfDay].bonus})
          </span>
        </button>

        {/* Auto Cycle Toggle */}
        <button
          onClick={onAutoCycleToggle}
          title={autoCycle ? 'Auto day/night cycle enabled' : 'Time paused on current hour'}
          className={`px-2.5 py-1.5 rounded-xl border font-medium flex items-center gap-1 cursor-pointer transition-colors ${
            autoCycle
              ? 'bg-emerald-950/70 text-emerald-300 border-emerald-500/40 hover:bg-emerald-900/70'
              : 'bg-slate-800/80 text-slate-400 border-slate-700/50 hover:bg-slate-800'
          }`}
        >
          <span>{autoCycle ? '⏱️ Auto' : '⏸️ Fixed'}</span>
        </button>

        {/* Weather Toggle */}
        <button
          onClick={onWeatherToggle}
          title="Toggle Rainfall (Attracts storm/mud fish & creates surface ripples)"
          className={`px-3 py-1.5 rounded-xl border font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95 ${
            weather === 'rain'
              ? 'bg-sky-950/80 text-sky-200 border-sky-500/60 shadow-sky-950/50'
              : 'bg-slate-800/90 text-slate-300 border-slate-700/60 hover:bg-slate-700'
          }`}
        >
          <span>{weather === 'rain' ? '🌧️ Rain' : '☀️ Clear'}</span>
        </button>

        {/* Season Toggle */}
        <button
          onClick={cycleSeason}
          title={`Click to change season (Bonus: ${SEASON_CONFIG[season].bonus})`}
          className={`px-3 py-1.5 rounded-xl border font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-95 ${
            season === 'winter'
              ? 'bg-cyan-950/80 text-cyan-200 border-cyan-400/50'
              : 'bg-slate-800/90 text-slate-300 border-slate-700/60 hover:bg-slate-700'
          }`}
        >
          <span>{SEASON_CONFIG[season].icon}</span>
          <span>{SEASON_CONFIG[season].label}</span>
        </button>
      </div>

      {/* Center/Right: Casting Zone Selector & Active Visitor Badge */}
      <div className="flex flex-wrap items-center gap-2">
        
        {/* Cast Zone Indicator / Selector */}
        <div className="flex items-center gap-1 bg-slate-950/70 p-1 rounded-xl border border-slate-800">
          <span className="text-[10px] text-slate-400 px-1 font-semibold uppercase tracking-wider hidden md:inline">
            Cast Target:
          </span>
          {zones.map(z => {
            const zc = ZONE_CONFIG[z];
            const isSelected = selectedZone === z;
            return (
              <button
                key={z}
                onClick={() => onSelectZone(z)}
                title={`${zc.label}: ${zc.description}`}
                className={`px-2 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-500 text-slate-950 shadow-md font-bold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <span>{zc.icon}</span>
                <span className="hidden sm:inline">{zc.label}</span>
              </button>
            );
          })}
        </div>

        {/* Visitor Sanctuary Button / Alert */}
        <button
          onClick={onOpenVisitorModal}
          title="Open Pond Visitors & Sanctuary Log"
          className={`px-3 py-1.5 rounded-xl border font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-sm ${
            activeVisitorType
              ? 'bg-gradient-to-r from-amber-500/25 to-emerald-500/25 border-amber-400/60 text-amber-200 animate-pulse hover:border-amber-300'
              : 'bg-slate-800/90 hover:bg-slate-800 border-slate-700/60 text-slate-300'
          }`}
        >
          {activeVisitorType ? (
            <>
              <span className="text-sm">{VISITORS_CONFIG[activeVisitorType].emoji}</span>
              <span className="font-bold text-white">
                {visitorName || VISITORS_CONFIG[activeVisitorType].defaultName} is visiting!
              </span>
            </>
          ) : (
            <>
              <span>🐾</span>
              <span>Visitors</span>
            </>
          )}
        </button>

      </div>
    </div>
  );
};
