import React from 'react';
import { LocationDef, ActiveEvent } from '../types/game';
import {
  Anchor,
  Award,
  BookOpen,
  ChevronRight,
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
  Package,
  Ship,
  ShoppingBag,
  Trophy,
  Wrench,
} from 'lucide-react';

interface TopBarProps {
  coins: number;
  starPearls: number;
  currentLocation: LocationDef;
  activeEvents: ActiveEvent[];
  soundEnabled: boolean;
  onToggleSound: () => void;
  onOpenLocations: () => void;
  onOpenInventory: () => void;
  onOpenUpgrades: () => void;
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
  onOpenInventory,
  onOpenUpgrades,
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

  const MenuItem = ({ icon: Icon, label, detail, onClick, featured = false }: {
    icon: React.ElementType;
    label: string;
    detail: string;
    onClick: () => void;
    featured?: boolean;
  }) => (
    <button type="button" className={`pond-menu-item ${featured ? 'is-featured' : ''}`} onClick={onClick}>
      <span className="pond-menu-item-icon"><Icon size={17} /></span>
      <span className="pond-menu-item-copy"><strong>{label}</strong><small>{detail}</small></span>
      <ChevronRight size={15} className="pond-menu-item-arrow" />
    </button>
  );

  return (
    <div className="pond-menu">
      <div className="pond-menu-heading">
        <div className="pond-menu-brand">
          <span className="pond-menu-brand-icon"><Fish size={22} /></span>
          <span><h1>Infinite Fishing Pond</h1><p>Your little corner of the water</p></span>
        </div>
        <div className="pond-menu-resources">
          <span><Coins size={15} /> {coins.toLocaleString()}</span>
          <button type="button" onClick={onOpenPrestige} title="Star pearls and prestige"><Sparkles size={15} /> {starPearls.toLocaleString()}</button>
        </div>
      </div>

      <div className="pond-menu-status">
        <button type="button" className="pond-menu-location" onClick={onOpenLocations}>
          <MapPin size={17} />
          <span><small>CURRENT POND</small><strong>{currentLocation.name}</strong></span>
          <Compass size={14} />
        </button>
        <div className="pond-menu-event">
          <span className={`pond-menu-status-dot ${event ? '' : 'is-quiet'}`} />
          <span>{event ? event.event.name : 'A quiet afternoon'}</span>
          {event && <small>{Math.ceil(event.timeRemaining)}s</small>}
          {merchantEvent && onOpenMerchant && <button type="button" onClick={onOpenMerchant}>Visit</button>}
        </div>
      </div>

      <div className="pond-menu-groups">
        <section className="pond-menu-group">
          <h2><Wrench size={14} /> TACKLE &amp; EQUIPMENT</h2>
          <div className="pond-menu-grid">
            <MenuItem icon={Wrench} label="Upgrade Bench" detail="Rod, bait, lines & more" onClick={onOpenUpgrades} featured />
            <MenuItem icon={ShoppingBag} label="Fish Inventory" detail="Manage and sell catches" onClick={onOpenInventory} />
            {onOpenShipyard && <MenuItem icon={Ship} label="Shipyard" detail="Improve your boat" onClick={onOpenShipyard} />}
            {onOpenMerchant && <MenuItem icon={Coins} label="Traveling Merchant" detail="Browse special offers" onClick={onOpenMerchant} />}
          </div>
        </section>

        <section className="pond-menu-group">
          <h2><Compass size={14} /> EXPLORE &amp; COLLECT</h2>
          <div className="pond-menu-grid">
            <MenuItem icon={MapPin} label="Locations" detail="Discover fishing spots" onClick={onOpenLocations} />
            <MenuItem icon={Fish} label="Fish Collection" detail="Browse discovered species" onClick={onOpenEncyclopedia} />
            <MenuItem icon={Trophy} label="Achievements" detail="See your milestones" onClick={onOpenAchievements} />
            {onOpenStoryJournal && <MenuItem icon={BookOpen} label="Story Journal" detail="Follow the pond's story" onClick={onOpenStoryJournal} />}
            {onOpenVisitors && <MenuItem icon={PawPrint} label="Pond Friends" detail="Visit animal companions" onClick={onOpenVisitors} />}
          </div>
        </section>

        <section className="pond-menu-group">
          <h2><Sparkles size={14} /> PERSONALIZE &amp; SETTINGS</h2>
          <div className="pond-menu-grid">
            <MenuItem icon={Shirt} label="Outfits" detail="Customize your fisherman" onClick={onOpenWardrobe} />
            <MenuItem icon={SettingsIcon} label="Settings" detail="Game and save options" onClick={onOpenSettings} />
            <MenuItem icon={soundEnabled ? Volume2 : VolumeX} label={soundEnabled ? 'Sound: On' : 'Sound: Off'} detail="Toggle game audio" onClick={onToggleSound} />
          </div>
        </section>
      </div>
    </div>
  );
};
