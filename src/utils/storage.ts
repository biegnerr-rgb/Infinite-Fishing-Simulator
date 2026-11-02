import { GameSaveState, CaughtFish, FishVariant, FishDiscoveryRecord } from '../types/game';
import { ALL_FISH, FISH_VARIANTS, RARITY_CONFIG } from '../data/fishData';
import { LOCATIONS } from '../data/locationsData';
import { UPGRADES } from '../data/upgradesData';

import { DEFAULT_CUSTOMIZATION } from '../data/cosmeticsData';
import { getInitialBefriendedVisitors } from '../data/visitorsData';
import { INITIAL_STORY_STATE } from '../data/storyData';

const SAVE_KEY = 'infinite_fishing_pond_v1';

export const INITIAL_SAVE_STATE: GameSaveState = {
  version: 1,
  coins: 0,
  starPearls: 0,
  lifetimeCoins: 0,
  lifetimeFishCaught: 0,
  fishCaughtThisRun: 0,
  currentLocationId: 'little_pond',
  unlockedLocations: ['little_pond'],
  upgrades: {
    fishing_rod: 1,
    lucky_bait: 0,
    auto_fisher: 0,
    multiple_lines: 1,
    auto_seller: 0,
    pond_expansion: 1,
    offline_catcher: 1,
    sonar_scanner: 0,
  },
  prestigeUpgrades: {
    eternal_luck: 0,
    cosmic_essence: 0,
    tide_caller: 0,
    pearl_harvester: 0,
    master_fisherman: 0,
  },
  inventory: [],
  inventoryCapacity: 45,
  discoveries: {},
  unlockedAchievements: [],
  aquariumFishIds: [],
  settings: {
    soundEnabled: true,
    ambientSound: true,
    soundVolume: 0.6,
    particleDensity: 'high',
    autoSellCommons: false,
    autoSellUncommons: false,
    autoSellRares: false,
    fastCatchMode: false,
  },
  lastSavedAt: Date.now(),
  prestigeCount: 0,
  customization: DEFAULT_CUSTOMIZATION,
  timeOfDay: 'day',
  weather: 'clear',
  season: 'spring',
  autoCycleTime: true,
  befriendedVisitors: getInitialBefriendedVisitors(),
  selectedCastZone: 'deep_water',
  lastVisitorArrival: Date.now() - 30000,
  boatTier: 1,
  storyState: INITIAL_STORY_STATE,
};

export function loadGame(): { state: GameSaveState; offlineResult?: OfflineCatchResult } {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) {
      return { state: { ...INITIAL_SAVE_STATE, lastSavedAt: Date.now() } };
    }
    const parsed = JSON.parse(raw);
    const initialVisitors = getInitialBefriendedVisitors();
    const savedVisitors = parsed.befriendedVisitors || {};

    const state: GameSaveState = {
      ...INITIAL_SAVE_STATE,
      ...parsed,
      fishCaughtThisRun: typeof parsed.fishCaughtThisRun === 'number' ? parsed.fishCaughtThisRun : (parsed.lifetimeFishCaught || 0),
      timeOfDay: parsed.timeOfDay || 'day',
      weather: parsed.weather || 'clear',
      season: parsed.season || 'spring',
      autoCycleTime: parsed.autoCycleTime !== undefined ? parsed.autoCycleTime : true,
      selectedCastZone: parsed.selectedCastZone || 'deep_water',
      befriendedVisitors: { ...initialVisitors, ...savedVisitors },
      settings: { ...INITIAL_SAVE_STATE.settings, ...(parsed.settings || {}) },
      upgrades: { ...INITIAL_SAVE_STATE.upgrades, ...(parsed.upgrades || {}) },
      prestigeUpgrades: { ...INITIAL_SAVE_STATE.prestigeUpgrades, ...(parsed.prestigeUpgrades || {}) },
      customization: { ...DEFAULT_CUSTOMIZATION, ...(parsed.customization || {}) },
      discoveries: parsed.discoveries || {},
      boatTier: parsed.boatTier || 1,
      storyState: {
        ...INITIAL_STORY_STATE,
        ...(parsed.storyState || {}),
        collectedPageIds: Array.from(new Set([...(parsed.storyState?.collectedPageIds || ['page_1'])])),
        readPageIds: parsed.storyState?.readPageIds || [],
        collectedArtifactIds: parsed.storyState?.collectedArtifactIds || [],
        completedQuestIds: parsed.storyState?.completedQuestIds || [],
        completedChapters: parsed.storyState?.completedChapters || [],
        readDialogueIds: parsed.storyState?.readDialogueIds || [],
      },
    };

    // Calculate offline gains
    const now = Date.now();
    const elapsedSeconds = Math.max(0, (now - (state.lastSavedAt || now)) / 1000);
    let offlineResult: OfflineCatchResult | undefined = undefined;

    if (elapsedSeconds > 60 && state.upgrades.auto_fisher > 0) {
      offlineResult = calculateOfflineCatches(state, elapsedSeconds);
    }

    state.lastSavedAt = now;
    return { state, offlineResult };
  } catch (e) {
    console.error('Failed to load save from localStorage:', e);
    return { state: { ...INITIAL_SAVE_STATE, lastSavedAt: Date.now() } };
  }
}

export function saveGame(state: GameSaveState): void {
  try {
    const toSave: GameSaveState = {
      ...state,
      lastSavedAt: Date.now(),
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(toSave));
  } catch (e) {
    console.error('Failed to save game to localStorage:', e);
  }
}

export function resetGame(): GameSaveState {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch (e) {
    console.error('Failed to reset storage:', e);
  }
  return { ...INITIAL_SAVE_STATE, lastSavedAt: Date.now() };
}

export function exportSaveCode(state: GameSaveState): string {
  try {
    return btoa(unescape(encodeURIComponent(JSON.stringify(state))));
  } catch {
    return JSON.stringify(state);
  }
}

export function importSaveCode(code: string): GameSaveState | null {
  try {
    let jsonStr = '';
    try {
      jsonStr = decodeURIComponent(escape(atob(code.trim())));
    } catch {
      jsonStr = code.trim();
    }
    const parsed = JSON.parse(jsonStr);
    if (parsed && typeof parsed.coins === 'number') {
      return {
        ...INITIAL_SAVE_STATE,
        ...parsed,
        lastSavedAt: Date.now(),
      };
    }
    return null;
  } catch {
    return null;
  }
}

export interface OfflineCatchResult {
  elapsedSeconds: number;
  totalCatches: number;
  coinsEarned: number;
  fishKept: number;
  topFishName?: string;
  topFishVariant?: FishVariant;
}

// Procedural offline simulator
function calculateOfflineCatches(state: GameSaveState, elapsedSeconds: number): OfflineCatchResult {
  const offlineLevel = state.upgrades.offline_catcher || 1;
  const maxOfflineSeconds = (offlineLevel * 4) * 3600; // e.g. level 1 = 4h
  const cappedSeconds = Math.min(elapsedSeconds, maxOfflineSeconds);

  // Auto-fisher interval
  const intervals = [12, 9, 7, 5.5, 4.2, 3.2, 2.5, 2.0, 1.7, 1.3];
  const autoLevel = state.upgrades.auto_fisher || 1;
  const interval = intervals[Math.min(autoLevel - 1, intervals.length - 1)];
  const multiLines = state.upgrades.multiple_lines || 1;

  const efficiency = Math.min(1.0, 0.4 + offlineLevel * 0.1);
  const potentialCycles = Math.floor(cappedSeconds / interval);
  const totalCatches = Math.min(600, Math.floor(potentialCycles * multiLines * efficiency));

  if (totalCatches <= 0) {
    return { elapsedSeconds: cappedSeconds, totalCatches: 0, coinsEarned: 0, fishKept: 0 };
  }

  // Determine current location species
  const locationSpecies = ALL_FISH.filter(f => f.locationId === state.currentLocationId);
  const availableSpecies = locationSpecies.length > 0 ? locationSpecies : ALL_FISH.filter(f => f.locationId === 'little_pond');

  let coinsEarned = 0;
  let fishKept = 0;
  let highestValue = 0;
  let topFishName = '';
  let topFishVariant: FishVariant = 'Standard';

  const rodTierValue = (UPGRADES.fishing_rod.getValue(state.upgrades.fishing_rod || 1) as number) || 1.0;
  const locDef = LOCATIONS.find(l => l.id === state.currentLocationId) || LOCATIONS[0];
  const autoSellLevel = state.upgrades.auto_seller || 0;

  for (let i = 0; i < totalCatches; i++) {
    // Pick random fish
    const species = availableSpecies[Math.floor(Math.random() * availableSpecies.length)];
    const size = +(species.minSize + Math.random() * (species.maxSize - species.minSize)).toFixed(1);
    
    // Pick variant
    let variant: FishVariant = 'Standard';
    const roll = Math.random();
    if (roll < 0.05) variant = 'Golden';
    else if (roll < 0.10) variant = 'Giant';
    else if (roll < 0.15) variant = 'Tiny';
    else if (roll < 0.18) variant = 'Glowing';
    else if (roll < 0.20) variant = 'Rainbow';

    const varMultiplier = FISH_VARIANTS[variant].multiplier;
    const value = Math.round(species.basePrice * varMultiplier * rodTierValue * locDef.catchValueMultiplier);

    // Track discoveries
    if (!state.discoveries[species.id]) {
      state.discoveries[species.id] = {
        speciesId: species.id,
        discovered: true,
        timesCaught: 0,
        maxSize: 0,
        variantsDiscovered: [],
      };
    }
    const rec = state.discoveries[species.id];
    rec.discovered = true;
    rec.timesCaught += 1;
    if (size > rec.maxSize) rec.maxSize = size;
    if (!rec.variantsDiscovered.includes(variant)) {
      rec.variantsDiscovered.push(variant);
    }

    if (value > highestValue) {
      highestValue = value;
      topFishName = species.name;
      topFishVariant = variant;
    }

    // Auto-sell logic or keep
    const isRarePlus = species.rarity !== 'Common' && species.rarity !== 'Uncommon';
    const shouldSell = autoSellLevel > 0 || state.settings.autoSellCommons && species.rarity === 'Common';

    if (shouldSell && (!isRarePlus || autoSellLevel >= 3)) {
      coinsEarned += value;
    } else if (state.inventory.length < state.inventoryCapacity) {
      const caught: CaughtFish = {
        instanceId: `offline_${Date.now()}_${i}`,
        speciesId: species.id,
        variant,
        size,
        value,
        caughtAt: Date.now() - Math.floor(Math.random() * cappedSeconds * 1000),
        caughtLocation: state.currentLocationId,
        isFavorite: false,
        isInAquarium: false,
      };
      state.inventory.push(caught);
      fishKept += 1;
    } else {
      // Inventory full, convert to coins
      coinsEarned += value;
    }
  }

  state.coins += coinsEarned;
  state.lifetimeCoins += coinsEarned;
  state.lifetimeFishCaught += totalCatches;

  return {
    elapsedSeconds: cappedSeconds,
    totalCatches,
    coinsEarned,
    fishKept,
    topFishName,
    topFishVariant,
  };
}
