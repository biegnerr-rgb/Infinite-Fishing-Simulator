import React from 'react';
import { LocationDef, ActiveEvent } from '../types/game';
import {
  Anchor,
  Award,
  BookOpen,
  Coins,
  Compass,
  Fish,
  MapPin,
  PawPrint,
  Settings as SettingsIcon,
  Shirt,
  Sparkles,
  Volume2,
  VolumeX,
} from 'lucide-react';

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
  const merchantEvent = activeEvents.find(event => event.event.bonusType === 'traveling_merchant');
  const event = activeEvents[0];

  return (
    <header className="game-header select-none">
      <div className="game-brand">
        <div className="brand-mark" aria-hidden="true">
          <span>✦</span>
          <Fish size={22} strokeWidth={2.5} />
        </div>
        <div className="brand-copy">
          <h1>Infinite Fishing Pond</h1>
          <span>Little moments, big catches</span>
        </div>
      </div>

      <button className="location-chip" onClick={onOpenLocations} title="Explore the world map">
        <span className="location-icon"><MapPin size={15} /></span>
        <span className="location-copy"><strong>{currentLocation.name}</strong><small>YOUR POND</small></span>
        <Compass size={15} className="location-compass" />
      </button>

      <div className="header-right">
        {event ? (
          <button
            className={`event-chip ${merchantEvent ? 'merchant-event' : ''}`}
            onClick={() => merchantEvent && onOpenMerchant?.()}
            disabled={!merchantEvent}
            title={merchantEvent ? 'Visit the traveling merchant' : event.event.name}
          >
            <span className="event-sparkle">✦</span>
            <span>{event.event.name}</span>
            <small>{Math.ceil(event.timeRemaining)}s</small>
          </button>
        ) : (
          <span className="quiet-chip"><span className="quiet-dot" /> A quiet afternoon</span>
        )}

        <div className="resource-pills" aria-label="Resources">
          <div className="resource-pill coins-pill" title="Fishing coins">
            <Coins size={16} />
            <span>{coins.toLocaleString()}</span>
          </div>
          <button className="resource-pill pearl-pill" onClick={onOpenPrestige} title="Star pearls and ascension">
            <Sparkles size={15} />
            <span>{starPearls.toLocaleString()}</span>
          </button>
        </div>

        <nav className="game-nav" aria-label="Game menu">
          <button className="nav-icon-button" onClick={onOpenEncyclopedia} title="Fish collection" aria-label="Fish collection"><Fish /></button>
          <button className="nav-icon-button" onClick={onOpenAchievements} title="Achievements" aria-label="Achievements"><Award /></button>
          {onOpenStoryJournal && <button className="nav-icon-button journal-button" onClick={onOpenStoryJournal} title="Story journal" aria-label="Story journal"><BookOpen /></button>}
          {onOpenVisitors && <button className="nav-icon-button visitor-button" onClick={onOpenVisitors} title="Pond visitors" aria-label="Pond visitors"><PawPrint /></button>}
          {onOpenShipyard && <button className="nav-icon-button" onClick={onOpenShipyard} title="Shipyard" aria-label="Shipyard"><Anchor /></button>}
          <button className="nav-icon-button" onClick={onOpenWardrobe} title="Outfits" aria-label="Outfits"><Shirt /></button>
          <button className="nav-icon-button sound-button" onClick={onToggleSound} title={soundEnabled ? 'Mute sounds' : 'Enable sounds'} aria-label={soundEnabled ? 'Mute sounds' : 'Enable sounds'}>
            {soundEnabled ? <Volume2 /> : <VolumeX />}
          </button>
          <button className="nav-icon-button settings-button" onClick={onOpenSettings} title="Settings" aria-label="Settings"><SettingsIcon /></button>
        </nav>
      </div>
    </header>
  );
};
