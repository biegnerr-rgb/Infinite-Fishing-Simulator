export type Rarity = 'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary' | 'Secret';

export type FishVariant = 
  | 'Standard'
  | 'Golden'
  | 'Giant'
  | 'Tiny'
  | 'Glowing'
  | 'Rainbow'
  | 'Ancient'
  | 'Cosmic'
  | 'Corrupted';

export type PondZone = 'lily_pads' | 'deep_water' | 'rocks_reef' | 'reeds';
export type TimeOfDay = 'dawn' | 'day' | 'dusk' | 'night';
export type WeatherType = 'clear' | 'rain';
export type SeasonType = 'spring' | 'summer' | 'autumn' | 'winter';
export type VisitorType = 'frog' | 'turtle' | 'duck' | 'otter' | 'crab' | 'raccoon';

export interface BefriendedVisitor {
  id: string;
  type: VisitorType;
  name: string;
  friendship: number; // 0 - 100
  timesFed: number;
  lastFedAt: number;
  favoriteFood: string;
  personality: string;
  giftsGiven: number;
}

export interface ActiveVisitorScene {
  id: string;
  type: VisitorType;
  x: number; // 0 to 1 normalized canvas pos
  y: number; // 0 to 1 normalized canvas pos
  targetX: number;
  targetY: number;
  state: 'idle' | 'walking' | 'swimming' | 'eating' | 'leaving';
  arrivedAt: number;
  duration: number; // how long it stays (seconds)
  hasGift: boolean;
  hasBeenFedThisVisit: boolean;
}

export interface FishSpecies {
  id: string;
  name: string;
  scientificName: string;
  rarity: Rarity;
  locationId: string;
  basePrice: number;
  minSize: number; // in cm
  maxSize: number; // in cm
  description: string;
  preferredDepth: 'surface' | 'mid' | 'deep';
  color: string;
  accentColor: string;
  finColor: string;
  pattern: 'plain' | 'stripes' | 'spots' | 'glow' | 'scales' | 'fins' | 'whiskers';
  specialCondition?: string; // e.g., 'Requires Night' or 'Requires Golden Rain'
  minRodLevel?: number; // Minimum fishing rod tier required to catch this creature (e.g. 4 for Sharks, 5 for Whales, 6 for Megalodon)
  preferredZone?: PondZone | 'any'; // Specific cast area where this species congregates
  preferredTime?: 'any' | 'day' | 'night' | 'dawn_dusk'; // Active time of day
  rainAffinity?: boolean; // Appears much more often during rainfall
  winterOnly?: boolean; // Ice fishing exclusive species
}

export interface CaughtFish {
  instanceId: string;
  speciesId: string;
  variant: FishVariant;
  size: number;
  value: number;
  caughtAt: number;
  caughtLocation: string;
  isFavorite: boolean;
  isInAquarium: boolean;
}

export interface FishDiscoveryRecord {
  speciesId: string;
  discovered: boolean;
  firstCaughtAt?: number;
  timesCaught: number;
  maxSize: number;
  variantsDiscovered: FishVariant[];
}

export interface LocationDef {
  id: string;
  name: string;
  subtitle: string;
  unlockCost: number;
  requiredPrestige?: number;
  description: string;
  waterColors: [string, string, string]; // top, mid, bottom gradient
  bedColor: string;
  particleType: 'petals' | 'sparkles' | 'bubbles' | 'abyssal_spores' | 'stardust';
  accentTheme: string;
  minRodLevel: number;
  catchValueMultiplier: number;
}

export interface UpgradeDef {
  id: string;
  name: string;
  description: string;
  category: 'rod' | 'bait' | 'auto' | 'utility';
  maxLevel: number;
  baseCost: number;
  costMultiplier: number;
  getValue: (level: number) => number | string;
  effectDescription: (level: number) => string;
}

export interface PrestigeUpgradeDef {
  id: string;
  name: string;
  description: string;
  maxLevel: number;
  baseCost: number; // in Star Pearls
  costMultiplier: number;
  effect: (level: number) => number;
  effectDescription: (level: number) => string;
}

export interface GameEventDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  durationSeconds: number;
  flavorText: string;
  color: string;
  bgFilter?: string;
  bonusType: 
    | 'golden_boost'
    | 'mutation_wave'
    | 'rare_school'
    | 'lucky_tide'
    | 'rainbow_mist'
    | 'blood_moon'
    | 'meteor_shower'
    | 'plankton_bloom'
    | 'traveling_merchant'
    | 'treasure_chest'
    | 'giant_sighting'
    | 'sunken_relic'
    | 'kraken_whisper'
    | 'whispering_eels'
    | 'cosmic_eclipse';
}

export interface ActiveEvent {
  event: GameEventDef;
  endsAt: number;
  timeRemaining: number;
}

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  rewardCoins: number;
  rewardPearls: number;
  isUnlocked: (state: GameSaveState) => boolean;
}

export interface GameSettings {
  soundEnabled: boolean;
  ambientSound: boolean;
  soundVolume: number;
  particleDensity: 'low' | 'medium' | 'high';
  autoSellCommons: boolean;
  autoSellUncommons: boolean;
  autoSellRares: boolean;
  fastCatchMode: boolean; // bypass modal for instant manual fishing
}

export interface GameSaveState {
  version: number;
  coins: number;
  starPearls: number;
  lifetimeCoins: number;
  lifetimeFishCaught: number;
  fishCaughtThisRun?: number; // Fish caught in current incarnation/ascension
  currentLocationId: string;
  unlockedLocations: string[];
  upgrades: Record<string, number>;
  prestigeUpgrades: Record<string, number>;
  inventory: CaughtFish[];
  inventoryCapacity: number;
  discoveries: Record<string, FishDiscoveryRecord>;
  unlockedAchievements: string[];
  aquariumFishIds: string[];
  settings: GameSettings;
  lastSavedAt: number;
  prestigeCount: number;
  customization?: import('../data/cosmeticsData').FishermanCustomization;
  timeOfDay?: TimeOfDay;
  weather?: WeatherType;
  season?: SeasonType;
  autoCycleTime?: boolean;
  befriendedVisitors?: Record<VisitorType, BefriendedVisitor>;
  selectedCastZone?: PondZone;
  lastVisitorArrival?: number;
  boatTier?: number;
  storyState?: import('./story').StoryState;
}
