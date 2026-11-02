/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  GameSaveState,
  FishSpecies,
  CaughtFish,
  FishVariant,
  Rarity,
  ActiveEvent,
  GameEventDef,
  PondZone,
  TimeOfDay,
  WeatherType,
  SeasonType,
  VisitorType,
  ActiveVisitorScene,
  BefriendedVisitor,
} from './types/game';
import { ALL_FISH, FISH_VARIANTS, RARITY_CONFIG } from './data/fishData';
import { LOCATIONS } from './data/locationsData';
import { UPGRADES, PRESTIGE_UPGRADES, ROD_TIERS } from './data/upgradesData';
import { RANDOM_EVENTS } from './data/eventsData';
import { ACHIEVEMENTS } from './data/achievementsData';
import { VISITORS_CONFIG, getInitialBefriendedVisitors } from './data/visitorsData';
import { sound } from './utils/audio';
import {
  loadGame,
  saveGame,
  resetGame,
  exportSaveCode,
  importSaveCode,
  OfflineCatchResult,
} from './utils/storage';

// Components
import { PondCanvas3D as PondCanvas } from './components/PondCanvas3D';
import { TopBar } from './components/TopBar';
import { FishCatchModal } from './components/FishCatchModal';
import { UpgradesPanel } from './components/UpgradesPanel';
import { EncyclopediaModal } from './components/EncyclopediaModal';
import { InventoryModal } from './components/InventoryModal';
import { LocationsModal } from './components/LocationsModal';
import { PrestigeModal } from './components/PrestigeModal';
import { AchievementsModal } from './components/AchievementsModal';
import { MerchantModal } from './components/MerchantModal';
import { WardrobeModal } from './components/WardrobeModal';
import { VisitorModal } from './components/VisitorModal';
import { PondEnvironmentControls } from './components/PondEnvironmentControls';
import { DEFAULT_CUSTOMIZATION, FishermanCustomization } from './data/cosmeticsData';
import { OfflineProgressModal } from './components/OfflineProgressModal';
import { SettingsModal } from './components/SettingsModal';
import { StoryJournalModal } from './components/StoryJournalModal';
import { ShipyardModal } from './components/ShipyardModal';
import { StoryDialogueModal } from './components/StoryDialogueModal';
import {
  BOAT_TIERS,
  STORY_CHAPTERS,
  STORY_CHARACTERS,
  STORY_QUESTS,
  STORY_ARTIFACTS,
  JOURNAL_PAGES,
  INITIAL_STORY_STATE,
} from './data/storyData';
import { StoryState, StoryCharacterDef, CharacterDialogue } from './types/story';

import {
  Sparkles,
  ShoppingBag,
  Wrench,
  BookOpen,
  MapPin,
  Fish,
  Award,
  Coins,
  ChevronRight,
  Eye,
  Shirt,
  Anchor,
} from 'lucide-react';

export default function App() {
  // Game Save State
  const [gameState, setGameState] = useState<GameSaveState>(() => {
    const { state } = loadGame();
    return state;
  });

  // Offline Progress modal
  const [offlineResult, setOfflineResult] = useState<OfflineCatchResult | null>(null);

  // Active Modals
  const [activeModal, setActiveModal] = useState<
    | 'none'
    | 'encyclopedia'
    | 'inventory'
    | 'locations'
    | 'prestige'
    | 'achievements'
    | 'merchant'
    | 'settings'
    | 'wardrobe'
    | 'visitors'
    | 'storyJournal'
    | 'shipyard'
    | 'storyDialogue'
  >('none');

  // Story & Companion State
  const [activeDialogueChar, setActiveDialogueChar] = useState<StoryCharacterDef | null>(null);
  const [activeDialogue, setActiveDialogue] = useState<CharacterDialogue | null>(null);
  const [hasFloatingBottle, setHasFloatingBottle] = useState<boolean>(true);
  const [bubblesMessage, setBubblesMessage] = useState<string>('✨ Cast your line!');

  // Dynamic Day/Night, Weather, Season, and Pond Zone State
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>(gameState.timeOfDay || 'day');
  const [weather, setWeather] = useState<WeatherType>(gameState.weather || 'clear');
  const [season, setSeason] = useState<SeasonType>(gameState.season || 'spring');
  const [autoCycle, setAutoCycle] = useState<boolean>(gameState.autoCycleTime !== undefined ? gameState.autoCycleTime : true);
  const [selectedZone, setSelectedZone] = useState<PondZone>(gameState.selectedCastZone || 'deep_water');
  const [activeVisitor, setActiveVisitor] = useState<ActiveVisitorScene | null>(null);

  // Bottom active tab
  const [activeTab, setActiveTab] = useState<'pond' | 'upgrades'>('pond');

  // Aquarium Mode view toggle (shows only favorited caught fish in pond)
  const [isAquariumMode, setIsAquariumMode] = useState<boolean>(false);

  // Manual Fishing State
  const [fishingState, setFishingState] = useState<'idle' | 'casting' | 'waiting' | 'nibble' | 'hooked' | 'reeling'>('idle');
  const [activeCatch, setActiveCatch] = useState<{
    fish: CaughtFish;
    species: FishSpecies;
    isNewSpecies: boolean;
    isNewRecord: boolean;
  } | null>(null);

  // Active Events
  const [activeEvents, setActiveEvents] = useState<ActiveEvent[]>([]);

  // Recent Catches Toast Feed
  const [recentCatches, setRecentCatches] = useState<Array<{ id: string; text: string; rarityColor: string }>>([]);

  // Auto-fisher progress indicator (0 to 100%)
  const [autoProgress, setAutoProgress] = useState<number>(0);

  // Sound sync
  useEffect(() => {
    sound.setMuted(!gameState.settings.soundEnabled);
    sound.setVolume(gameState.settings.soundVolume);
  }, [gameState.settings.soundEnabled, gameState.settings.soundVolume]);

  // Check offline catch on initial mount
  useEffect(() => {
    const { offlineResult: offRes } = loadGame();
    if (offRes && offRes.totalCatches > 0) {
      setOfflineResult(offRes);
    }
  }, []);

  // Periodic Autosave every 10 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      saveGame(gameState);
    }, 10000);
    return () => clearInterval(timer);
  }, [gameState]);

  // Current Location definition
  const currentLocation = LOCATIONS.find(l => l.id === gameState.currentLocationId) || LOCATIONS[0];
  const availableSpecies = ALL_FISH.filter(f => f.locationId === gameState.currentLocationId);

  // Aquarium Fish items
  const aquariumFish = gameState.inventory
    .filter(f => gameState.aquariumFishIds.includes(f.instanceId))
    .map(f => {
      const sp = ALL_FISH.find(s => s.id === f.speciesId) || availableSpecies[0];
      return { species: sp, variant: f.variant };
    });

  // Push recent catch feed toast (compact & auto-expiring)
  const pushCatchFeed = useCallback((text: string, rarityColor: string) => {
    const id = `${Date.now()}_${Math.random()}`;
    setRecentCatches(prev => [
      { id, text, rarityColor },
      ...prev.slice(0, 2), // Keep max 3 small toasts
    ]);
    setTimeout(() => {
      setRecentCatches(prev => prev.filter(rc => rc.id !== id));
    }, 3800);
  }, []);

  // Automatic Day / Night Cycle (advances every 75s when autoCycle is true)
  useEffect(() => {
    if (!autoCycle) return;
    const interval = setInterval(() => {
      setTimeOfDay(prev => {
        const times: TimeOfDay[] = ['dawn', 'day', 'dusk', 'night'];
        const nextIdx = (times.indexOf(prev) + 1) % times.length;
        const nextTime = times[nextIdx];
        setGameState(g => ({ ...g, timeOfDay: nextTime }));
        return nextTime;
      });
    }, 75000);
    return () => clearInterval(interval);
  }, [autoCycle]);

  // Periodic Visitors arrival engine (spawns visitor every 110s, stays for 90s)
  useEffect(() => {
    const visitorTypes: VisitorType[] = ['frog', 'turtle', 'duck', 'otter', 'crab', 'raccoon'];

    const spawnVisitor = () => {
      const picked = visitorTypes[Math.floor(Math.random() * visitorTypes.length)];
      const newVisitorScene: ActiveVisitorScene = {
        id: `vis_${Date.now()}`,
        type: picked,
        x: 0.3,
        y: 0.4,
        targetX: 0.3,
        targetY: 0.4,
        state: 'idle',
        arrivedAt: Date.now(),
        duration: 90,
        hasGift: true,
        hasBeenFedThisVisit: false,
      };
      setActiveVisitor(newVisitorScene);

      const vConfig = VISITORS_CONFIG[picked];
      const customName = gameState.befriendedVisitors?.[picked]?.name || vConfig.defaultName;
      pushCatchFeed(`🐾 ${customName} the ${vConfig.speciesTitle} has arrived at the pond!`, '#f59e0b');

      setTimeout(() => {
        setActiveVisitor(curr => (curr && curr.id === newVisitorScene.id ? null : curr));
      }, 90000);
    };

    const initialTimer = setTimeout(spawnVisitor, 5000);
    const recurringInterval = setInterval(spawnVisitor, 110000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(recurringInterval);
    };
  }, [gameState.befriendedVisitors, pushCatchFeed]);

  // Visitor interactions
  const handleRenameVisitor = useCallback((type: VisitorType, newName: string) => {
    setGameState(prev => {
      const visitors = { ...(prev.befriendedVisitors || getInitialBefriendedVisitors()) };
      if (visitors[type]) {
        visitors[type] = { ...visitors[type], name: newName };
      }
      return { ...prev, befriendedVisitors: visitors };
    });
    pushCatchFeed(`Named your ${type}: ${newName}! 💕`, '#10b981');
  }, [pushCatchFeed]);

  const handleFeedVisitor = useCallback((type: VisitorType, foodName: string) => {
    const config = VISITORS_CONFIG[type];
    const isFavorite = config.favoriteFood.toLowerCase().includes(foodName.split(' ')[0].toLowerCase()) ||
                       foodName.toLowerCase().includes(config.favoriteFood.split(' ')[0].toLowerCase());
    const friendshipGain = isFavorite ? 20 : 12;

    const baseGift = config.baseGift;
    const bonusCoins = Math.floor(baseGift.minCoins + Math.random() * (baseGift.maxCoins - baseGift.minCoins));
    const givesPearl = Math.random() < baseGift.chancePearl;
    const pearlsAwarded = givesPearl ? 1 : 0;

    setGameState(prev => {
      const visitors = { ...(prev.befriendedVisitors || getInitialBefriendedVisitors()) };
      const current = visitors[type] || {
        id: `visitor_${type}`,
        type,
        name: config.defaultName,
        friendship: 0,
        timesFed: 0,
        lastFedAt: 0,
        favoriteFood: config.favoriteFood,
        personality: config.personality,
        giftsGiven: 0,
      };

      const updatedFriendship = Math.min(100, current.friendship + friendshipGain);
      visitors[type] = {
        ...current,
        friendship: updatedFriendship,
        timesFed: current.timesFed + 1,
        lastFedAt: Date.now(),
        giftsGiven: current.giftsGiven + 1,
      };

      return {
        ...prev,
        coins: prev.coins + bonusCoins,
        starPearls: prev.starPearls + pearlsAwarded,
        lifetimeCoins: prev.lifetimeCoins + bonusCoins,
        befriendedVisitors: visitors,
      };
    });

    const thankMsg = isFavorite
      ? `${config.defaultName} LOVED their favorite ${foodName}! ❤️ (+${friendshipGain} Friendship)`
      : `${config.defaultName} happily munched the ${foodName}! (+${friendshipGain} Friendship)`;

    pushCatchFeed(`🎁 ${config.defaultName} gifted you ${bonusCoins} coins!`, '#facc15');

    return {
      coins: bonusCoins,
      pearls: pearlsAwarded,
      message: thankMsg,
    };
  }, [pushCatchFeed]);

  // --- STORY & BOAT HANDLERS ---
  // Periodic Message in a Bottle Spawn (every 85s if there are uncollected pages)
  useEffect(() => {
    const checkAndSpawnBottle = () => {
      const currentStory = gameState.storyState || INITIAL_STORY_STATE;
      if (currentStory.collectedPageIds.length < JOURNAL_PAGES.length) {
        setHasFloatingBottle(true);
        setBubblesMessage('📜 Bottle in water!');
      }
    };

    const initialBottleTimer = setTimeout(checkAndSpawnBottle, 10000);
    const bottleInterval = setInterval(checkAndSpawnBottle, 85000);

    return () => {
      clearTimeout(initialBottleTimer);
      clearInterval(bottleInterval);
    };
  }, [gameState.storyState]);

  const handleCollectBottle = useCallback(() => {
    sound.playCatchSuccess();
    setHasFloatingBottle(false);

    setGameState(prev => {
      const currentStory = prev.storyState || INITIAL_STORY_STATE;
      const uncollectedPages = JOURNAL_PAGES.filter(p => !currentStory.collectedPageIds.includes(p.id));
      if (uncollectedPages.length === 0) return prev;

      const nextPg = uncollectedPages[0];
      const updatedStory: StoryState = {
        ...currentStory,
        collectedPageIds: [...currentStory.collectedPageIds, nextPg.id],
      };

      pushCatchFeed(`📜 Grandfather's Logbook: Page #${nextPg.pageNumber} Found!`, '#fbbf24');
      setBubblesMessage(`✨ New Page: ${nextPg.title}!`);

      return {
        ...prev,
        storyState: updatedStory,
      };
    });

    setActiveModal('storyJournal');
  }, [pushCatchFeed]);

  const handleInteractBubbles = useCallback(() => {
    sound.playClick();
    const bubblesChar = STORY_CHARACTERS.find(c => c.id === 'bubbles') || STORY_CHARACTERS[1];
    const story = gameState.storyState || INITIAL_STORY_STATE;
    const availableDialogues = bubblesChar.dialogues.filter(d => d.chapterRequired <= story.currentChapter);
    const chosenDialogue = availableDialogues[availableDialogues.length - 1] || bubblesChar.dialogues[0];

    setActiveDialogueChar(bubblesChar);
    setActiveDialogue(chosenDialogue);
    setActiveModal('storyDialogue');
  }, [gameState.storyState]);

  const handleTalkToCharacter = useCallback((charId: 'old_finn' | 'bubbles' | 'milo' | 'keeper') => {
    const char = STORY_CHARACTERS.find(c => c.id === charId);
    if (!char) return;
    const story = gameState.storyState || INITIAL_STORY_STATE;
    const availableDialogues = char.dialogues.filter(d => d.chapterRequired <= story.currentChapter);
    const chosenDialogue = availableDialogues[availableDialogues.length - 1] || char.dialogues[0];

    setActiveDialogueChar(char);
    setActiveDialogue(chosenDialogue);
    setActiveModal('storyDialogue');
  }, [gameState.storyState]);

  const handleSelectDialogueOption = useCallback((optionIdx: number, rewardCoins?: number, rewardPearls?: number) => {
    if (rewardCoins || rewardPearls) {
      setGameState(prev => ({
        ...prev,
        coins: prev.coins + (rewardCoins || 0),
        starPearls: prev.starPearls + (rewardPearls || 0),
        lifetimeCoins: prev.lifetimeCoins + (rewardCoins || 0),
      }));
      pushCatchFeed(`Gift from companion: +${rewardCoins || 0}🪙 +${rewardPearls || 0}🔮!`, '#38bdf8');
    }
  }, [pushCatchFeed]);

  const handleUpgradeBoat = useCallback((targetTier: number) => {
    const boatDef = BOAT_TIERS.find(b => b.tier === targetTier);
    if (!boatDef) return;

    setGameState(prev => {
      const currentTier = prev.boatTier || 1;
      if (targetTier <= currentTier) {
        pushCatchFeed(`Switched active flagship to ${boatDef.name}!`, '#38bdf8');
        return { ...prev, boatTier: targetTier };
      }

      if (prev.coins < boatDef.cost) {
        return prev;
      }

      sound.playUpgrade();
      pushCatchFeed(`⚓ Commissioned ${boatDef.name}! +${boatDef.biteSpeedBonus}% Bite Speed, +${boatDef.capacityBonus} Slots!`, '#eab308');
      setBubblesMessage(`🛥️ Wow! Look at our new ${boatDef.name}!`);

      const updatedCoins = prev.coins - boatDef.cost;
      const updatedStory = { ...(prev.storyState || INITIAL_STORY_STATE) };

      // Complete boat tier quests
      const boatQuests = STORY_QUESTS.filter(q => q.targetType === 'boat_tier' && Number(q.targetValue) <= targetTier && !updatedStory.completedQuestIds.includes(q.id));
      boatQuests.forEach(bq => {
        updatedStory.completedQuestIds = [...updatedStory.completedQuestIds, bq.id];
        if (bq.rewardJournalPageId && !updatedStory.collectedPageIds.includes(bq.rewardJournalPageId)) {
          updatedStory.collectedPageIds = [...updatedStory.collectedPageIds, bq.rewardJournalPageId];
        }
        if (bq.rewardArtifactId && !updatedStory.collectedArtifactIds.includes(bq.rewardArtifactId)) {
          updatedStory.collectedArtifactIds = [...updatedStory.collectedArtifactIds, bq.rewardArtifactId];
        }
      });

      return {
        ...prev,
        coins: updatedCoins,
        boatTier: targetTier,
        storyState: updatedStory,
      };
    });
  }, [pushCatchFeed]);

  const handleClaimQuestReward = useCallback((questId: string) => {
    const quest = STORY_QUESTS.find(q => q.id === questId);
    if (!quest) return;

    setGameState(prev => {
      const story = { ...(prev.storyState || INITIAL_STORY_STATE) };
      if (story.completedQuestIds.includes(questId)) return prev;

      let isMet = false;
      if (quest.targetType === 'catch_count') {
        isMet = prev.lifetimeFishCaught >= Number(quest.targetValue);
      } else if (quest.targetType === 'boat_tier') {
        isMet = (prev.boatTier || 1) >= Number(quest.targetValue);
      } else if (quest.targetType === 'reach_location') {
        isMet = prev.unlockedLocations.includes(String(quest.targetValue));
      } else if (quest.targetType === 'catch_variant') {
        isMet = Object.values(prev.discoveries).some(d => d.variantsDiscovered.some(v => v !== 'Standard'));
      }

      if (!isMet) {
        pushCatchFeed(`Quest "${quest.title}" requirements not yet fulfilled!`, '#f59e0b');
        return prev;
      }

      sound.playCatchSuccess();
      story.completedQuestIds = [...story.completedQuestIds, questId];

      if (quest.rewardJournalPageId && !story.collectedPageIds.includes(quest.rewardJournalPageId)) {
        story.collectedPageIds = [...story.collectedPageIds, quest.rewardJournalPageId];
        pushCatchFeed(`📖 Unlocked Grandfather's Logbook Page!`, '#fbbf24');
      }

      if (quest.rewardArtifactId && !story.collectedArtifactIds.includes(quest.rewardArtifactId)) {
        story.collectedArtifactIds = [...story.collectedArtifactIds, quest.rewardArtifactId];
        const artifact = STORY_ARTIFACTS.find(a => a.id === quest.rewardArtifactId);
        pushCatchFeed(`🔮 Discovered Relic: ${artifact?.name}!`, '#c084fc');
        setBubblesMessage(`✨ We found ${artifact?.name}!`);
      }

      // Check if current chapter can advance
      const chapterQuests = STORY_QUESTS.filter(q => q.chapter === story.currentChapter);
      const allChapterQuestsDone = chapterQuests.every(q => story.completedQuestIds.includes(q.id) || q.id === questId);

      let extraChapterPearls = 0;
      if (allChapterQuestsDone && !story.completedChapters.includes(story.currentChapter)) {
        const currentChDef = STORY_CHAPTERS.find(c => c.chapter === story.currentChapter);
        story.completedChapters = [...story.completedChapters, story.currentChapter];
        extraChapterPearls = currentChDef?.rewardPearls || 10;
        if (story.currentChapter < 5) {
          story.currentChapter += 1;
        } else {
          story.storyCompleted = true;
        }
        pushCatchFeed(`🌟 Chapter Restored! +${extraChapterPearls} Star Pearls!`, '#a855f7');
        setBubblesMessage('🎉 Chapter complete! The waters rejoice!');
      }

      return {
        ...prev,
        coins: prev.coins + quest.rewardCoins,
        starPearls: prev.starPearls + quest.rewardPearls + extraChapterPearls,
        storyState: story,
      };
    });
  }, [pushCatchFeed]);

  // --- FISH GENERATION ENGINE ---
  const generateCatch = useCallback((targetZone: PondZone = selectedZone): {
    fish: CaughtFish;
    species: FishSpecies;
    isNewSpecies: boolean;
    isNewRecord: boolean;
  } => {
    // 1. Determine active event bonuses
    const goldenRainActive = activeEvents.some(e => e.event.bonusType === 'golden_boost');
    const mutationWaveActive = activeEvents.some(e => e.event.bonusType === 'mutation_wave');
    const rareSchoolActive = activeEvents.some(e => e.event.bonusType === 'rare_school');
    const luckyTideActive = activeEvents.some(e => e.event.bonusType === 'lucky_tide');
    const rainbowMistActive = activeEvents.some(e => e.event.bonusType === 'rainbow_mist');
    const bloodMoonActive = activeEvents.some(e => e.event.bonusType === 'blood_moon');
    const giantSightingActive = activeEvents.some(e => e.event.bonusType === 'giant_sighting');
    const krakenActive = activeEvents.some(e => e.event.bonusType === 'kraken_whisper');

    // 2. Base Rarity Weights with upgrades
    const luckyBaitLevel = gameState.upgrades.lucky_bait || 0;
    const eternalLuckLevel = gameState.prestigeUpgrades.eternal_luck || 0;
    const luckMultiplier = 1.0 + (luckyBaitLevel * 0.12) + (eternalLuckLevel * 0.15) + (rareSchoolActive ? 0.35 : 0) + (luckyTideActive ? 0.4 : 0);

    // Roll rarity tier
    const rarityRoll = Math.random();
    let selectedRarity: Rarity = 'Common';

    const secretChance = (RARITY_CONFIG.Secret.chance * luckMultiplier) + (krakenActive || bloodMoonActive ? 0.015 : 0);
    const legendaryChance = secretChance + (RARITY_CONFIG.Legendary.chance * luckMultiplier);
    const epicChance = legendaryChance + (RARITY_CONFIG.Epic.chance * luckMultiplier);
    const rareChance = epicChance + (RARITY_CONFIG.Rare.chance * luckMultiplier);
    const uncommonChance = rareChance + (RARITY_CONFIG.Uncommon.chance * (luckMultiplier * 0.8));

    if (rarityRoll < secretChance) selectedRarity = 'Secret';
    else if (rarityRoll < legendaryChance) selectedRarity = 'Legendary';
    else if (rarityRoll < epicChance) selectedRarity = 'Epic';
    else if (rarityRoll < rareChance) selectedRarity = 'Rare';
    else if (rarityRoll < uncommonChance) selectedRarity = 'Uncommon';
    else selectedRarity = 'Common';

    // Filter available species matching current location, rolled rarity, rod tier, and season/weather conditions
    const rodLevel = gameState.upgrades.fishing_rod || 1;
    let eligibleSpecies = availableSpecies.filter(f => {
      if ((f.minRodLevel || 1) > rodLevel) return false;
      if (f.winterOnly && season !== 'winter') return false;
      return true;
    });

    if (eligibleSpecies.length === 0) {
      eligibleSpecies = availableSpecies;
    }

    let pool = eligibleSpecies.filter(f => f.rarity === selectedRarity);
    if (pool.length === 0) {
      pool = eligibleSpecies;
    }

    // Weight species by Zone affinity, Time of Day, Rain, and Rod level
    const weightedPool: FishSpecies[] = [];
    pool.forEach(sp => {
      let weight = 1;

      // Higher rod bonus on apex titans
      const spMinRod = sp.minRodLevel || 1;
      if (spMinRod >= 3 && rodLevel >= spMinRod) {
        weight += (rodLevel - spMinRod);
      }

      // Zone preference bonus (e.g. lily pads, deep water, rocks, reeds)
      if (sp.preferredZone && sp.preferredZone === targetZone) {
        weight += 3;
      }

      // Time of Day bonus (Daytime, Nocturnal, Dawn/Dusk)
      if (sp.preferredTime) {
        if (sp.preferredTime === timeOfDay) weight += 3;
        else if (sp.preferredTime === 'dawn_dusk' && (timeOfDay === 'dawn' || timeOfDay === 'dusk')) weight += 4;
      }

      // Rain affinity bonus
      if (sp.rainAffinity && weather === 'rain') {
        weight += 3;
      }

      for (let w = 0; w < weight; w++) {
        weightedPool.push(sp);
      }
    });

    const species = weightedPool[Math.floor(Math.random() * weightedPool.length)];

    // 3. Roll Variant
    const cosmicEssenceLevel = gameState.prestigeUpgrades.cosmic_essence || 0;
    const variantMultiplier = 1.0 + (cosmicEssenceLevel * 0.25) + (mutationWaveActive ? 0.4 : 0);

    let variant: FishVariant = 'Standard';
    const varRoll = Math.random();

    if (goldenRainActive && Math.random() < 0.35) {
      variant = 'Golden';
    } else if (rainbowMistActive && Math.random() < 0.25) {
      variant = 'Rainbow';
    } else if (giantSightingActive && Math.random() < 0.35) {
      variant = 'Giant';
    } else if (varRoll < 0.005 * variantMultiplier) {
      variant = 'Corrupted';
    } else if (varRoll < 0.015 * variantMultiplier) {
      variant = 'Cosmic';
    } else if (varRoll < 0.03 * variantMultiplier) {
      variant = 'Ancient';
    } else if (varRoll < 0.06 * variantMultiplier) {
      variant = 'Rainbow';
    } else if (varRoll < 0.10 * variantMultiplier) {
      variant = 'Glowing';
    } else if (varRoll < 0.16 * variantMultiplier) {
      variant = 'Golden';
    } else if (varRoll < 0.24 * variantMultiplier) {
      variant = 'Giant';
    } else if (varRoll < 0.34 * variantMultiplier) {
      variant = 'Tiny';
    }

    // 4. Calculate Size & Value
    let size = +(species.minSize + Math.random() * (species.maxSize - species.minSize)).toFixed(1);
    if (variant === 'Giant') size = +(size * 1.8).toFixed(1);
    if (variant === 'Tiny') size = +(size * 0.45).toFixed(1);

    const rodMult = (UPGRADES.fishing_rod.getValue(rodLevel) as number) || 1.0;
    const varMult = FISH_VARIANTS[variant].multiplier;
    const locMult = currentLocation.catchValueMultiplier;
    const eventValueMult = luckyTideActive ? 2.0 : 1.0;

    const value = Math.round(species.basePrice * varMult * rodMult * locMult * eventValueMult);

    // 5. Check Records
    const existingRec = gameState.discoveries[species.id];
    const isNewSpecies = !existingRec || !existingRec.discovered;
    const isNewRecord = !existingRec || size > existingRec.maxSize;

    const caughtFish: CaughtFish = {
      instanceId: `fish_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      speciesId: species.id,
      variant,
      size,
      value,
      caughtAt: Date.now(),
      caughtLocation: currentLocation.id,
      isFavorite: false,
      isInAquarium: false,
    };

    return {
      fish: caughtFish,
      species,
      isNewSpecies,
      isNewRecord,
    };
  }, [activeEvents, availableSpecies, currentLocation, gameState, selectedZone, timeOfDay, weather, season]);

  // Current active cast zone for ongoing cast
  const [activeCastZone, setActiveCastZone] = useState<PondZone>(selectedZone);

  // Apply catch to game state
  const commitCatch = useCallback((catchItem: {
    fish: CaughtFish;
    species: FishSpecies;
    isNewSpecies: boolean;
    isNewRecord: boolean;
  }, autoKeepOrSell: 'keep' | 'sell' = 'keep') => {
    setGameState(prev => {
      const disc = { ...prev.discoveries };
      const rec = disc[catchItem.species.id] || {
        speciesId: catchItem.species.id,
        discovered: true,
        timesCaught: 0,
        maxSize: 0,
        variantsDiscovered: [],
      };

      rec.discovered = true;
      rec.timesCaught += 1;
      if (catchItem.fish.size > rec.maxSize) rec.maxSize = catchItem.fish.size;
      if (!rec.variantsDiscovered.includes(catchItem.fish.variant)) {
        rec.variantsDiscovered.push(catchItem.fish.variant);
      }
      disc[catchItem.species.id] = rec;

      // Pearl Harvester prestige check (chance for Epic+ fish to drop Star Pearls directly)
      const pearlHarvesterLevel = prev.prestigeUpgrades.pearl_harvester || 0;
      let extraPearls = 0;
      if (pearlHarvesterLevel > 0 && ['Epic', 'Legendary', 'Secret'].includes(catchItem.species.rarity)) {
        if (Math.random() < pearlHarvesterLevel * 0.08) {
          extraPearls += 1;
          pushCatchFeed(`🔮 Pearl Harvester dropped 1 Star Pearl!`, '#c084fc');
        }
      }

      const curBoat = BOAT_TIERS.find(b => b.tier === (prev.boatTier || 1)) || BOAT_TIERS[0];
      const effectiveCap = prev.inventoryCapacity + curBoat.capacityBonus;
      const shouldSell = autoKeepOrSell === 'sell' || (prev.inventory.length >= effectiveCap);

      // Check quest completion for catch count and variant
      const story = { ...(prev.storyState || INITIAL_STORY_STATE) };
      const newTotalCaught = prev.lifetimeFishCaught + 1;

      STORY_QUESTS.forEach(q => {
        if (!story.completedQuestIds.includes(q.id)) {
          let met = false;
          if (q.targetType === 'catch_count' && newTotalCaught >= Number(q.targetValue)) met = true;
          if (q.targetType === 'catch_variant' && catchItem.fish.variant !== 'Standard') met = true;

          if (met) {
            story.completedQuestIds = [...story.completedQuestIds, q.id];
            if (q.rewardJournalPageId && !story.collectedPageIds.includes(q.rewardJournalPageId)) {
              story.collectedPageIds = [...story.collectedPageIds, q.rewardJournalPageId];
              pushCatchFeed(`📖 Unlocked Grandfather's Log Page!`, '#fbbf24');
            }
            if (q.rewardArtifactId && !story.collectedArtifactIds.includes(q.rewardArtifactId)) {
              story.collectedArtifactIds = [...story.collectedArtifactIds, q.rewardArtifactId];
              const art = STORY_ARTIFACTS.find(a => a.id === q.rewardArtifactId);
              pushCatchFeed(`🔮 Found Ancient Relic: ${art?.name}!`, '#c084fc');
              setBubblesMessage(`✨ We found ${art?.name}!`);
            }
          }
        }
      });

      if (shouldSell) {
        return {
          ...prev,
          coins: prev.coins + catchItem.fish.value,
          starPearls: prev.starPearls + extraPearls,
          lifetimeCoins: prev.lifetimeCoins + catchItem.fish.value,
          lifetimeFishCaught: prev.lifetimeFishCaught + 1,
          fishCaughtThisRun: (prev.fishCaughtThisRun || 0) + 1,
          discoveries: disc,
          storyState: story,
        };
      } else {
        return {
          ...prev,
          starPearls: prev.starPearls + extraPearls,
          lifetimeFishCaught: prev.lifetimeFishCaught + 1,
          fishCaughtThisRun: (prev.fishCaughtThisRun || 0) + 1,
          inventory: [catchItem.fish, ...prev.inventory],
          discoveries: disc,
          storyState: story,
        };
      }
    });

    const vPrefix = catchItem.fish.variant !== 'Standard' ? `${catchItem.fish.variant} ` : '';
    pushCatchFeed(
      `+ ${vPrefix}${catchItem.species.name} (${catchItem.fish.size}cm)`,
      RARITY_CONFIG[catchItem.species.rarity].color
    );
  }, [pushCatchFeed]);

  // --- MANUAL FISHING LIFECYCLE ---
  const handleManualCast = useCallback((clickX?: number, clickY?: number, zone?: PondZone) => {
    if (fishingState !== 'idle') return;

    const targetZone = zone || selectedZone;
    setActiveCastZone(targetZone);
    if (zone && zone !== selectedZone) {
      setSelectedZone(zone);
      setGameState(p => ({ ...p, selectedCastZone: zone }));
    }

    setFishingState('casting');
    sound.playCast();

    // After casting flight arc (~750ms)
    setTimeout(() => {
      setFishingState('waiting');

      // Calculate boat bite speed and relic speed bonuses
      const curBoat = BOAT_TIERS.find(b => b.tier === (gameState.boatTier || 1)) || BOAT_TIERS[0];
      const hasCompass = gameState.storyState?.collectedArtifactIds.includes('star_compass');
      const hasPrism = gameState.storyState?.collectedArtifactIds.includes('astral_prism');
      const speedBonusPct = curBoat.biteSpeedBonus + (hasCompass ? 15 : 0) + (hasPrism ? 30 : 0);
      const speedMult = Math.max(0.35, 1 - speedBonusPct / 100);

      // Random wait before nibble (reduced by boat upgrade!)
      const waitTime = (1200 + Math.random() * 1800) * speedMult;
      setTimeout(() => {
        setFishingState('nibble');

        // Nibble before full bite (~850ms)
        setTimeout(() => {
          setFishingState('hooked');
          sound.playBite();
        }, 850);
      }, waitTime);
    }, 750);
  }, [fishingState, selectedZone, gameState.boatTier, gameState.storyState]);

  const handleReelIn = useCallback(() => {
    if (fishingState !== 'hooked' && fishingState !== 'nibble') return;

    sound.playReel();
    setFishingState('reeling');

    setTimeout(() => {
      setFishingState('idle');
      const newCatch = generateCatch(activeCastZone);
      sound.playCatch(newCatch.species.rarity);

      // Hidden zone discoveries & rewards!
      if (activeCastZone === 'lily_pads' && Math.random() < 0.12) {
        setGameState(p => ({ ...p, starPearls: p.starPearls + 1 }));
        pushCatchFeed('🪷 Found a shimmering Star Pearl floating on a lily pad! (+1 🔮)', '#c084fc');
        sound.playCatch('Epic');
      } else if (activeCastZone === 'rocks_reef' && Math.random() < 0.15) {
        const bonusCoins = Math.floor(250 + Math.random() * 800);
        setGameState(p => ({ ...p, coins: p.coins + bonusCoins, lifetimeCoins: p.lifetimeCoins + bonusCoins }));
        pushCatchFeed(`🪨 Uncovered an ancient coin pouch in the reef! (+${bonusCoins} 🪙)`, '#fbbf24');
      } else if (activeCastZone === 'reeds' && Math.random() < 0.14) {
        const bonusCoins = Math.floor(180 + Math.random() * 500);
        setGameState(p => ({ ...p, coins: p.coins + bonusCoins }));
        pushCatchFeed(`🌿 Found lost tackle & shiny lures in the reeds! (+${bonusCoins} 🪙)`, '#34d399');
      }

      // Automatically place the fish in the basket immediately!
      const isCommon = newCatch.species.rarity === 'Common';
      const isUncommon = newCatch.species.rarity === 'Uncommon';
      const shouldAutoSell = (gameState.settings.autoSellCommons && isCommon) || (gameState.settings.autoSellUncommons && isUncommon);
      commitCatch(newCatch, shouldAutoSell ? 'sell' : 'keep');

      // Still pop up on the screen so you can clearly see what you caught!
      if (!gameState.settings.fastCatchMode) {
        setActiveCatch(newCatch);
      }
    }, 300);
  }, [fishingState, generateCatch, activeCastZone, gameState.settings, commitCatch, pushCatchFeed]);

  // Keyboard shortcut: Spacebar to Cast or Reel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.code === 'Space') {
        e.preventDefault();
        if (fishingState === 'idle') {
          handleManualCast();
        } else if (fishingState === 'hooked' || fishingState === 'nibble') {
          handleReelIn();
        }
      } else if (e.code === 'Escape') {
        setActiveModal('none');
        setActiveCatch(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fishingState, handleManualCast, handleReelIn]);

  // --- AUTOMATIC FISHING CYCLE ---
  useEffect(() => {
    const autoLevel = gameState.upgrades.auto_fisher || 0;
    if (autoLevel <= 0) return;

    const intervals = [12, 9, 7, 5.5, 4.2, 3.2, 2.5, 2.0, 1.7, 1.3];
    let intervalSeconds = intervals[Math.min(autoLevel - 1, intervals.length - 1)];

    // Plankton bloom event speeds up auto-fisher
    const planktonActive = activeEvents.some(e => e.event.bonusType === 'plankton_bloom');
    if (planktonActive) intervalSeconds *= 0.35;

    const totalMs = intervalSeconds * 1000;
    const intervalStep = 100;
    let elapsed = 0;

    const intervalTimer = setInterval(() => {
      elapsed += intervalStep;
      setAutoProgress(Math.min(100, Math.round((elapsed / totalMs) * 100)));

      if (elapsed >= totalMs) {
        elapsed = 0;
        setAutoProgress(0);

        // Perform auto catches
        const multiLines = gameState.upgrades.multiple_lines || 1;
        const autoSellerLevel = gameState.upgrades.auto_seller || 0;

        for (let i = 0; i < multiLines; i++) {
          const autoCatch = generateCatch();
          const isCommon = autoCatch.species.rarity === 'Common';
          const isUncommon = autoCatch.species.rarity === 'Uncommon';
          const isDuplicate = !!gameState.discoveries[autoCatch.species.id]?.discovered;

          const shouldAutoSell = 
            (autoSellerLevel >= 1 && isCommon && isDuplicate) ||
            (autoSellerLevel >= 2 && (isCommon || isUncommon) && isDuplicate) ||
            (gameState.settings.autoSellCommons && isCommon) ||
            (gameState.settings.autoSellUncommons && isUncommon);

          commitCatch(autoCatch, shouldAutoSell ? 'sell' : 'keep');
        }
      }
    }, intervalStep);

    return () => clearInterval(intervalTimer);
  }, [gameState.upgrades.auto_fisher, gameState.upgrades.multiple_lines, gameState.upgrades.auto_seller, gameState.settings, activeEvents, generateCatch, commitCatch]);

  // --- RANDOM EVENT GENERATOR ---
  useEffect(() => {
    const tideCallerLevel = gameState.prestigeUpgrades.tide_caller || 0;
    // Base 55s interval, reduced by tide caller
    const eventInterval = Math.max(25000, 55000 - tideCallerLevel * 6000);

    const eventTimer = setInterval(() => {
      // 55% chance to trigger an event if less than 2 concurrent events
      if (activeEvents.length < 2 && Math.random() < 0.55) {
        const picked = RANDOM_EVENTS[Math.floor(Math.random() * RANDOM_EVENTS.length)];
        const duration = picked.durationSeconds + tideCallerLevel * 10;

        const newActive: ActiveEvent = {
          event: picked,
          endsAt: Date.now() + duration * 1000,
          timeRemaining: duration,
        };

        setActiveEvents(prev => [...prev.filter(e => e.event.id !== picked.id), newActive]);
        sound.playChest();
        pushCatchFeed(`🌟 Event Started: ${picked.name}!`, picked.color);
      }
    }, eventInterval);

    return () => clearInterval(eventTimer);
  }, [activeEvents.length, gameState.prestigeUpgrades.tide_caller, pushCatchFeed]);

  // Update active event timers
  useEffect(() => {
    if (activeEvents.length === 0) return;

    const timer = setInterval(() => {
      const now = Date.now();
      setActiveEvents(prev => {
        const remaining = prev
          .map(e => ({
            ...e,
            timeRemaining: Math.max(0, (e.endsAt - now) / 1000),
          }))
          .filter(e => e.timeRemaining > 0);
        return remaining;
      });
    }, 500);

    return () => clearInterval(timer);
  }, [activeEvents.length]);

  // --- INTERACTIVE EVENT CLICKS (Chest & Relic in pond) ---
  const handleCollectChest = () => {
    const chestReward = 800 + Math.floor(Math.random() * 1500) * currentLocation.catchValueMultiplier;
    const pearlChance = Math.random() < 0.4 ? 1 : 0;

    setGameState(prev => ({
      ...prev,
      coins: prev.coins + chestReward,
      starPearls: prev.starPearls + pearlChance,
      lifetimeCoins: prev.lifetimeCoins + chestReward,
    }));

    sound.playChest();
    pushCatchFeed(`📦 Cracked Treasure Chest: +${chestReward.toLocaleString()} Coins${pearlChance > 0 ? ' & +1 Pearl!' : ''}`, '#f59e0b');

    // Remove chest event
    setActiveEvents(prev => prev.filter(e => e.event.bonusType !== 'treasure_chest'));
  };

  const handleCollectRelic = () => {
    const relicReward = 3000 * currentLocation.catchValueMultiplier;
    setGameState(prev => ({
      ...prev,
      coins: prev.coins + relicReward,
      starPearls: prev.starPearls + 1,
      lifetimeCoins: prev.lifetimeCoins + relicReward,
    }));

    sound.playChest();
    pushCatchFeed(`☀️ Sunken Relic Claimed: +${relicReward.toLocaleString()} Coins & +1 Star Pearl!`, '#d97706');
    setActiveEvents(prev => prev.filter(e => e.event.bonusType !== 'sunken_relic'));
  };

  // --- UPGRADE PURCHASE HANDLER ---
  const handleBuyUpgrade = (upgradeId: string) => {
    const def = UPGRADES[upgradeId];
    if (!def) return;
    const currentLevel = gameState.upgrades[upgradeId] || (upgradeId === 'fishing_rod' || upgradeId === 'multiple_lines' || upgradeId === 'pond_expansion' ? 1 : 0);
    const cost = Math.floor(def.baseCost * Math.pow(def.costMultiplier, currentLevel));

    if (gameState.coins >= cost && currentLevel < def.maxLevel) {
      setGameState(prev => {
        const newUpgrades = { ...prev.upgrades, [upgradeId]: currentLevel + 1 };
        const newCapacity = upgradeId === 'pond_expansion' ? (30 + (currentLevel + 1) * 15) : prev.inventoryCapacity;

        return {
          ...prev,
          coins: prev.coins - cost,
          upgrades: newUpgrades,
          inventoryCapacity: newCapacity,
        };
      });
    }
  };

  // --- LOCATION TRAVEL & UNLOCK HANDLERS ---
  const handleSelectLocation = (locId: string) => {
    setGameState(prev => ({ ...prev, currentLocationId: locId }));
    pushCatchFeed(`Traveled to ${LOCATIONS.find(l => l.id === locId)?.name}`, '#38bdf8');
  };

  const handleUnlockLocation = (locId: string, cost: number) => {
    if (gameState.coins >= cost && !gameState.unlockedLocations.includes(locId)) {
      setGameState(prev => {
        const story = { ...(prev.storyState || INITIAL_STORY_STATE) };
        const reachQuests = STORY_QUESTS.filter(q => q.targetType === 'reach_location' && q.targetValue === locId && !story.completedQuestIds.includes(q.id));
        reachQuests.forEach(rq => {
          story.completedQuestIds = [...story.completedQuestIds, rq.id];
          if (rq.rewardJournalPageId && !story.collectedPageIds.includes(rq.rewardJournalPageId)) {
            story.collectedPageIds = [...story.collectedPageIds, rq.rewardJournalPageId];
            pushCatchFeed(`📖 Unlocked Grandpa's Log Page!`, '#fbbf24');
          }
        });

        return {
          ...prev,
          coins: prev.coins - cost,
          unlockedLocations: [...prev.unlockedLocations, locId],
          currentLocationId: locId,
          storyState: story,
        };
      });
      pushCatchFeed(`Unlocked and set sail for ${LOCATIONS.find(l => l.id === locId)?.name}!`, '#10b981');
    }
  };

  // --- INVENTORY MANAGEMENT HANDLERS ---
  const handleSellSingleFish = (instanceId: string) => {
    const fish = gameState.inventory.find(f => f.instanceId === instanceId);
    if (!fish) return;

    setGameState(prev => ({
      ...prev,
      coins: prev.coins + fish.value,
      lifetimeCoins: prev.lifetimeCoins + fish.value,
      inventory: prev.inventory.filter(f => f.instanceId !== instanceId),
      aquariumFishIds: prev.aquariumFishIds.filter(id => id !== instanceId),
    }));
  };

  const handleMassSell = (filterType: 'common' | 'uncommon' | 'all_non_fav') => {
    let soldValue = 0;
    const keptList: CaughtFish[] = [];

    gameState.inventory.forEach(f => {
      const sp = ALL_FISH.find(s => s.id === f.speciesId);
      const isFav = f.isFavorite;

      let shouldSell = false;
      if (!isFav) {
        if (filterType === 'common' && sp?.rarity === 'Common') shouldSell = true;
        else if (filterType === 'uncommon' && (sp?.rarity === 'Common' || sp?.rarity === 'Uncommon')) shouldSell = true;
        else if (filterType === 'all_non_fav') shouldSell = true;
      }

      if (shouldSell) {
        soldValue += f.value;
      } else {
        keptList.push(f);
      }
    });

    if (soldValue > 0) {
      setGameState(prev => ({
        ...prev,
        coins: prev.coins + soldValue,
        lifetimeCoins: prev.lifetimeCoins + soldValue,
        inventory: keptList,
      }));
      pushCatchFeed(`Sold catches for +${soldValue.toLocaleString()} Coins!`, '#fbbf24');
    }
  };

  const handleToggleFavorite = (instanceId: string) => {
    setGameState(prev => ({
      ...prev,
      inventory: prev.inventory.map(f =>
        f.instanceId === instanceId ? { ...f, isFavorite: !f.isFavorite } : f
      ),
    }));
  };

  const handleToggleAquarium = (instanceId: string) => {
    setGameState(prev => {
      const exists = prev.aquariumFishIds.includes(instanceId);
      const updated = exists
        ? prev.aquariumFishIds.filter(id => id !== instanceId)
        : [...prev.aquariumFishIds.slice(0, 11), instanceId];

      return {
        ...prev,
        aquariumFishIds: updated,
      };
    });
  };

  // --- PRESTIGE ASCENSION HANDLER ---
  const handleAscend = (earnedPearls: number) => {
    setGameState(prev => {
      const masterFishermanLevel = prev.prestigeUpgrades.master_fisherman || 0;
      const startCoins = masterFishermanLevel * 500;
      const startRod = 1 + masterFishermanLevel;

      return {
        ...prev,
        coins: startCoins,
        starPearls: prev.starPearls + earnedPearls,
        currentLocationId: 'little_pond',
        unlockedLocations: ['little_pond'],
        upgrades: {
          fishing_rod: startRod,
          lucky_bait: 0,
          auto_fisher: 0,
          multiple_lines: 1,
          auto_seller: 0,
          pond_expansion: 1,
          offline_catcher: 1,
          sonar_scanner: 0,
        },
        inventory: [],
        prestigeCount: prev.prestigeCount + 1,
        fishCaughtThisRun: 0,
      };
    });

    pushCatchFeed(`🌌 Ascended to Tier ${gameState.prestigeCount + 1}! Claimed +${earnedPearls} Star Pearls!`, '#c084fc');
  };

  const handleBuyPrestigeUpgrade = (upgradeId: string, cost: number) => {
    if (gameState.starPearls >= cost) {
      setGameState(prev => ({
        ...prev,
        starPearls: prev.starPearls - cost,
        prestigeUpgrades: {
          ...prev.prestigeUpgrades,
          [upgradeId]: (prev.prestigeUpgrades[upgradeId] || 0) + 1,
        },
      }));
    }
  };

  // --- MERCHANT BARNABY PURCHASES ---
  const handleBuyMerchantDeal = (dealId: string, costCoins: number, costPearls: number) => {
    if (gameState.coins >= costCoins && gameState.starPearls >= costPearls) {
      setGameState(prev => {
        let addCoins = 0;
        let addPearls = 0;

        if (dealId === 'pearl_bundle') addPearls = 2;
        if (dealId === 'golden_chum') addCoins = 2500;
        if (dealId === 'lucky_charm') addPearls = 1;
        if (dealId === 'mystery_crate') addCoins = 6000;

        return {
          ...prev,
          coins: prev.coins - costCoins + addCoins,
          starPearls: prev.starPearls - costPearls + addPearls,
          lifetimeCoins: prev.lifetimeCoins + addCoins,
        };
      });

      pushCatchFeed(`Purchased Barnaby's special trade goods!`, '#f59e0b');
    }
  };

  const handleUpdateCustomization = (newCustom: FishermanCustomization) => {
    setGameState(prev => ({ ...prev, customization: newCustom }));
  };

  const handleUnlockCosmetic = (itemId: string, costCoins: number, costPearls: number) => {
    setGameState(prev => {
      const custom = prev.customization || DEFAULT_CUSTOMIZATION;
      if (prev.coins >= costCoins && prev.starPearls >= costPearls) {
        return {
          ...prev,
          coins: prev.coins - costCoins,
          starPearls: prev.starPearls - costPearls,
          customization: {
            ...custom,
            unlockedCosmeticIds: [...custom.unlockedCosmeticIds, itemId],
          },
        };
      }
      return prev;
    });
  };

  const uniqueFishCount = Object.values(gameState.discoveries).filter(d => d.discovered).length;
  const currentRodTier = ROD_TIERS[Math.min((gameState.upgrades.fishing_rod || 1) - 1, ROD_TIERS.length - 1)];

  return (
    <div className="game-shell flex flex-col w-screen h-screen bg-slate-950 font-sans text-slate-100 overflow-hidden select-none">
      
      {/* 1. Top Resource & Navigation Bar */}
      <TopBar
        coins={gameState.coins}
        starPearls={gameState.starPearls}
        currentLocation={currentLocation}
        activeEvents={activeEvents}
        soundEnabled={gameState.settings.soundEnabled}
        onToggleSound={() => {
          setGameState(p => ({
            ...p,
            settings: { ...p.settings, soundEnabled: !p.settings.soundEnabled },
          }));
        }}
        onOpenLocations={() => setActiveModal('locations')}
        onOpenEncyclopedia={() => setActiveModal('encyclopedia')}
        onOpenAchievements={() => setActiveModal('achievements')}
        onOpenPrestige={() => setActiveModal('prestige')}
        onOpenWardrobe={() => setActiveModal('wardrobe')}
        onOpenSettings={() => setActiveModal('settings')}
        onOpenMerchant={() => setActiveModal('merchant')}
        onOpenVisitors={() => setActiveModal('visitors')}
        onOpenStoryJournal={() => setActiveModal('storyJournal')}
        onOpenShipyard={() => setActiveModal('shipyard')}
      />

      {/* 2. Main Game Viewport */}
      <div className="game-main flex-1 flex flex-col md:flex-row overflow-hidden p-3 gap-3">
        
        {/* Left / Center: Interactive Animated Pond */}
        <div className="pond-column flex-1 flex flex-col min-h-0 relative">
          
          {/* Dynamic Day/Night, Weather, Season, and Zone Controls Bar */}
          <div className="pond-toolbar mb-2">
            <PondEnvironmentControls
              timeOfDay={timeOfDay}
              weather={weather}
              season={season}
              autoCycle={autoCycle}
              selectedZone={selectedZone}
              activeVisitorType={activeVisitor?.type}
              visitorName={activeVisitor ? (gameState.befriendedVisitors?.[activeVisitor.type]?.name || VISITORS_CONFIG[activeVisitor.type].defaultName) : undefined}
              onTimeChange={(t) => {
                setTimeOfDay(t);
                setGameState(p => ({ ...p, timeOfDay: t }));
              }}
              onWeatherToggle={() => {
                const nextWeather = weather === 'clear' ? 'rain' : 'clear';
                setWeather(nextWeather);
                setGameState(p => ({ ...p, weather: nextWeather }));
              }}
              onSeasonChange={(s) => {
                setSeason(s);
                setGameState(p => ({ ...p, season: s }));
              }}
              onAutoCycleToggle={() => {
                setAutoCycle(a => !a);
                setGameState(p => ({ ...p, autoCycleTime: !autoCycle }));
              }}
              onSelectZone={(z) => {
                setSelectedZone(z);
                setGameState(p => ({ ...p, selectedCastZone: z }));
              }}
              onOpenVisitorModal={() => setActiveModal('visitors')}
            />
          </div>

          <div className="pond-stage flex-1 relative min-h-0">
            <PondCanvas
              location={currentLocation}
              availableFish={availableSpecies}
              aquariumFish={aquariumFish}
              isAquariumMode={isAquariumMode}
              activeEvents={activeEvents}
              isFishing={fishingState !== 'idle'}
              fishingState={fishingState}
              customization={gameState.customization || DEFAULT_CUSTOMIZATION}
              boatTier={gameState.boatTier || 1}
              bubblesMessage={bubblesMessage}
              hasFloatingBottle={hasFloatingBottle}
              timeOfDay={timeOfDay}
              weather={weather}
              season={season}
              selectedZone={selectedZone}
              activeVisitor={activeVisitor}
              visitorName={activeVisitor ? (gameState.befriendedVisitors?.[activeVisitor.type]?.name || VISITORS_CONFIG[activeVisitor.type].defaultName) : undefined}
              onManualCast={handleManualCast}
              onReelIn={handleReelIn}
              onCollectChest={handleCollectChest}
              onCollectRelic={handleCollectRelic}
              onCollectBottle={handleCollectBottle}
              onInteractBubbles={handleInteractBubbles}
              onInteractVisitor={() => setActiveModal('visitors')}
            />
            <div className="aquarium-toggle absolute top-4 right-4 flex items-center gap-2">
              <button
                onClick={() => setIsAquariumMode(!isAquariumMode)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold shadow-md transition-colors flex items-center gap-1.5 cursor-pointer backdrop-blur-md ${
                  isAquariumMode
                    ? 'bg-cyan-950/90 border-cyan-400 text-cyan-200'
                    : 'bg-slate-900/80 border-slate-700/80 text-slate-300 hover:text-white'
                }`}
              >
                <Eye className="w-3.5 h-3.5 text-cyan-400" />
                <span>{isAquariumMode ? 'Aquarium View (On)' : 'Wild Pond View'}</span>
              </button>
            </div>
          </div>

          {/* Toast Feed in bottom left corner of pond (compact, unobtrusive) */}
          <div className="absolute bottom-3 left-3 pointer-events-none flex flex-col-reverse gap-1 max-w-[210px] z-10">
            {recentCatches.map(rc => (
              <div
                key={rc.id}
                className="px-2 py-0.5 rounded-lg bg-slate-950/75 backdrop-blur-sm border border-slate-800/70 text-[10px] font-medium text-slate-300 shadow-sm animate-fade-in flex items-center gap-1.5"
              >
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: rc.rarityColor }} />
                <span className="truncate">{rc.text}</span>
              </div>
            ))}
          </div>

        </div>

        {/* Right: Equipment, Upgrades & Actions Dock */}
        <div className="angler-panel w-full md:w-96 flex flex-col bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-3xl overflow-hidden shadow-xl shrink-0">
          
          {/* Tabs Header */}
          <div className="panel-tabs p-2 border-b border-slate-800 flex items-center gap-2 bg-slate-950/40">
            <button
              onClick={() => setActiveTab('pond')}
              className={`flex-1 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === 'pond'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <span>🛶 Boat & Tackle</span>
            </button>
            <button
              onClick={() => setActiveTab('upgrades')}
              className={`flex-1 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === 'upgrades'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <span>🛠️ Tackle Shop</span>
            </button>
          </div>

          {/* Tab Content: Casting Dock */}
          {activeTab === 'pond' && (
            <div className="angler-content flex-1 p-4 overflow-y-auto space-y-4">
              
              {/* Primary Cast Action Button & Fisherman Profile */}
              <div className="cast-card p-4 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/80 text-center space-y-3 shadow-inner">
                <div className="flex items-center justify-between pb-2 border-b border-slate-700/60 text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🎣</span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-amber-200">
                          {gameState.customization?.name || 'Old Pete'}
                        </span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-950/70 text-cyan-300 border border-cyan-800/60 font-semibold">
                          Tier {gameState.boatTier || 1} Vessel
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 block">
                        Sailing {BOAT_TIERS.find(b => b.tier === (gameState.boatTier || 1))?.name || 'Rowboat'}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveModal('wardrobe')}
                    className="px-2 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1"
                    title="Change fisherman name and wardrobe"
                  >
                    <span>🎃 Outfits</span>
                  </button>
                </div>

                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Equipped Gear
                  </span>
                  <div className="text-sm font-black text-amber-300 flex items-center justify-center gap-1.5 mt-0.5">
                    <span>{currentRodTier.icon}</span>
                    <span>{currentRodTier.name}</span>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {currentRodTier.power}
                  </span>
                </div>

                {/* Big Interactive Action Button */}
                {fishingState === 'idle' ? (
                  <button
                    onClick={() => handleManualCast()}
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-emerald-950 font-black text-base tracking-wide shadow-xl shadow-emerald-950 flex items-center justify-center gap-2 transition-transform active:scale-95 cursor-pointer"
                  >
                    <span>🎣 Cast Fishing Line</span>
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-700/40 text-emerald-900">
                      Space
                    </span>
                  </button>
                ) : fishingState === 'hooked' ? (
                  <button
                    onClick={handleReelIn}
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-rose-600 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white font-black text-base tracking-wide shadow-xl shadow-rose-950 flex items-center justify-center gap-2 animate-bounce cursor-pointer"
                  >
                    <span>⚡ BITE! REEL IN NOW! 🎣</span>
                  </button>
                ) : fishingState === 'nibble' ? (
                  <button
                    onClick={handleReelIn}
                    className="w-full py-4 rounded-2xl bg-amber-600 hover:bg-amber-500 text-amber-950 font-black text-base tracking-wide shadow-lg flex items-center justify-center gap-2 cursor-pointer animate-pulse"
                  >
                    <span>🐟 Fish Nibbling... Ready!</span>
                  </button>
                ) : (
                  <div className="w-full py-4 rounded-2xl bg-slate-800 border border-slate-700 text-slate-400 font-bold text-sm flex items-center justify-center gap-2">
                    <span className="animate-spin">⏳</span>
                    <span>Waiting for fish to bite...</span>
                  </div>
                )}
              </div>

              {/* Automatic Fisher Status Bar */}
              <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/80 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-extrabold text-slate-200 flex items-center gap-1.5">
                    <span>⚙️ Auto-Fisher:</span>
                    <span className="text-emerald-400">
                      {gameState.upgrades.auto_fisher > 0 ? `Lv. ${gameState.upgrades.auto_fisher}` : 'Offline'}
                    </span>
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    {gameState.upgrades.auto_fisher > 0 ? `${autoProgress}%` : 'Not Installed'}
                  </span>
                </div>

                <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden border border-slate-800">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-100"
                    style={{ width: `${autoProgress}%` }}
                  />
                </div>

                <div className="text-[10px] text-slate-400 flex items-center justify-between">
                  <span>Lines: {gameState.upgrades.multiple_lines || 1}x</span>
                  <span>
                    {gameState.upgrades.auto_seller > 0 ? 'Pelican Drone Active' : 'Manual Sales'}
                  </span>
                </div>
              </div>

              {/* Quick Basket, Shipyard, Story & Log Shortcuts */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setActiveModal('inventory')}
                  className="p-2.5 rounded-2xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/80 text-left transition-colors cursor-pointer group"
                >
                  <div className="flex items-center justify-between text-amber-400 mb-1">
                    <ShoppingBag className="w-4 h-4" />
                    <span className="text-[10px] font-extrabold font-mono text-slate-200">
                      {gameState.inventory.length}/{(gameState.inventoryCapacity + (BOAT_TIERS.find(b => b.tier === (gameState.boatTier || 1))?.capacityBonus || 0))}
                    </span>
                  </div>
                  <span className="font-black text-xs text-white block">
                    Fish Basket
                  </span>
                  <span className="text-[10px] text-slate-400 block group-hover:text-slate-300">
                    Inspect / Sell &gt;
                  </span>
                </button>

                <button
                  onClick={() => setActiveModal('shipyard')}
                  className="p-2.5 rounded-2xl bg-cyan-950/40 hover:bg-cyan-900/40 border border-cyan-500/40 text-left transition-colors cursor-pointer group"
                >
                  <div className="flex items-center justify-between text-cyan-300 mb-1">
                    <Anchor className="w-4 h-4" />
                    <span className="text-[10px] font-bold text-cyan-400">Tier {gameState.boatTier || 1}/5</span>
                  </div>
                  <span className="font-black text-xs text-cyan-200 block">
                    Shipyard
                  </span>
                  <span className="text-[10px] text-cyan-400/80 block group-hover:text-cyan-300">
                    Upgrade Boat &gt;
                  </span>
                </button>

                <button
                  onClick={() => setActiveModal('storyJournal')}
                  className="p-2.5 rounded-2xl bg-amber-950/40 hover:bg-amber-900/40 border border-amber-500/40 text-left transition-colors cursor-pointer group"
                >
                  <div className="flex items-center justify-between text-amber-300 mb-1">
                    <BookOpen className="w-4 h-4" />
                    <span className="text-[10px] font-bold text-amber-400">Ch. {(gameState.storyState || INITIAL_STORY_STATE).currentChapter}/5</span>
                  </div>
                  <span className="font-black text-xs text-amber-200 block">
                    Story Journal
                  </span>
                  <span className="text-[10px] text-amber-400/80 block group-hover:text-amber-300">
                    Grandpa's Log &gt;
                  </span>
                </button>

                <button
                  onClick={() => setActiveModal('encyclopedia')}
                  className="p-2.5 rounded-2xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/80 text-left transition-colors cursor-pointer group"
                >
                  <div className="flex items-center justify-between text-sky-400 mb-1">
                    <Fish className="w-4 h-4" />
                    <span className="text-[10px] font-extrabold font-mono text-emerald-400">
                      {uniqueFishCount}/{ALL_FISH.length}
                    </span>
                  </div>
                  <span className="font-black text-xs text-white block">
                    Fish Log
                  </span>
                  <span className="text-[10px] text-slate-400 block group-hover:text-slate-300">
                    Species &gt;
                  </span>
                </button>
              </div>

              {/* Sell Entire Basket Quick Button */}
              {gameState.inventory.filter(f => !f.isFavorite).length > 0 && (
                <button
                  onClick={() => {
                    handleMassSell('all_non_fav');
                    sound.playCoin();
                  }}
                  className="w-full py-2.5 px-3 rounded-2xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-amber-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-950/40 transition-transform active:scale-95 cursor-pointer"
                >
                  <Coins className="w-4 h-4" />
                  <span>
                    Sell Entire Basket ({gameState.inventory.filter(f => !f.isFavorite).length} Fish · +🪙 {gameState.inventory.filter(f => !f.isFavorite).reduce((s, f) => s + f.value, 0).toLocaleString()})
                  </span>
                </button>
              )}

              {/* Quick Info & Tips */}
              <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400 space-y-1">
                <span className="font-bold text-slate-300 block">💡 Angler Wisdom:</span>
                <p>
                  Upgrading your boat in the Shipyard boosts bite speed, rare fish luck, and basket capacity! Click Bubbles or floating bottles to unveil the pond's ancient history.
                </p>
              </div>

            </div>
          )}

          {/* Tab Content: Tackle Shop (Upgrades) */}
          {activeTab === 'upgrades' && (
            <UpgradesPanel
              coins={gameState.coins}
              upgrades={gameState.upgrades}
              boatTier={gameState.boatTier || 1}
              onBuyUpgrade={handleBuyUpgrade}
              onOpenShipyard={() => setActiveModal('shipyard')}
            />
          )}

        </div>

      </div>

      {/* --- MODALS --- */}
      
      {/* 1. Fish Catch Reveal Modal */}
      {activeCatch && (
        <FishCatchModal
          catchData={activeCatch}
          onClose={() => setActiveCatch(null)}
          onQuickSell={() => {
            handleSellSingleFish(activeCatch.fish.instanceId);
            sound.playCoin();
            setActiveCatch(null);
          }}
          onFastModeToggle={(enabled) => {
            setGameState(p => ({
              ...p,
              settings: { ...p.settings, fastCatchMode: enabled },
            }));
          }}
          fastMode={gameState.settings.fastCatchMode}
        />
      )}

      {/* 2. Encyclopedia Modal */}
      {activeModal === 'encyclopedia' && (
        <EncyclopediaModal
          discoveries={gameState.discoveries}
          onClose={() => setActiveModal('none')}
        />
      )}

      {/* 3. Inventory Modal */}
      {activeModal === 'inventory' && (
        <InventoryModal
          inventory={gameState.inventory}
          capacity={gameState.inventoryCapacity}
          aquariumFishIds={gameState.aquariumFishIds}
          onSellFish={handleSellSingleFish}
          onMassSell={handleMassSell}
          onToggleFavorite={handleToggleFavorite}
          onToggleAquarium={handleToggleAquarium}
          onClose={() => setActiveModal('none')}
        />
      )}

      {/* 4. Locations Modal */}
      {activeModal === 'locations' && (
        <LocationsModal
          currentLocationId={gameState.currentLocationId}
          unlockedLocations={gameState.unlockedLocations}
          coins={gameState.coins}
          onSelectLocation={handleSelectLocation}
          onUnlockLocation={handleUnlockLocation}
          onClose={() => setActiveModal('none')}
        />
      )}

      {/* 5. Prestige Ascension Modal */}
      {activeModal === 'prestige' && (
        <PrestigeModal
          starPearls={gameState.starPearls}
          lifetimeCoins={gameState.lifetimeCoins}
          uniqueFishCaught={uniqueFishCount}
          prestigeUpgrades={gameState.prestigeUpgrades}
          prestigeCount={gameState.prestigeCount}
          fishCaughtThisRun={gameState.fishCaughtThisRun || 0}
          onAscend={handleAscend}
          onBuyPrestigeUpgrade={handleBuyPrestigeUpgrade}
          onClose={() => setActiveModal('none')}
        />
      )}

      {/* 6. Achievements Modal */}
      {activeModal === 'achievements' && (
        <AchievementsModal
          saveState={gameState}
          unlockedAchievements={gameState.unlockedAchievements}
          onClose={() => setActiveModal('none')}
        />
      )}

      {/* 7. Merchant Modal */}
      {activeModal === 'merchant' && (
        <MerchantModal
          coins={gameState.coins}
          starPearls={gameState.starPearls}
          onBuyItem={handleBuyMerchantDeal}
          onClose={() => setActiveModal('none')}
        />
      )}

      {/* 8. Settings Modal */}
      {activeModal === 'settings' && (
        <SettingsModal
          settings={gameState.settings}
          onUpdateSettings={(newSet) => {
            setGameState(p => ({
              ...p,
              settings: { ...p.settings, ...newSet },
            }));
          }}
          onManualSave={() => saveGame(gameState)}
          onExportSave={() => exportSaveCode(gameState)}
          onImportSave={(code) => {
            const restored = importSaveCode(code);
            if (restored) {
              setGameState(restored);
              return true;
            }
            return false;
          }}
          onHardReset={() => {
            const fresh = resetGame();
            setGameState(fresh);
          }}
          onClose={() => setActiveModal('none')}
        />
      )}

      {/* Wardrobe & Outfits Customizer Modal */}
      {activeModal === 'wardrobe' && (
        <WardrobeModal
          customization={gameState.customization || DEFAULT_CUSTOMIZATION}
          coins={gameState.coins}
          starPearls={gameState.starPearls}
          onUpdateCustomization={handleUpdateCustomization}
          onUnlockCosmetic={handleUnlockCosmetic}
          onClose={() => setActiveModal('none')}
        />
      )}

      {/* 10. Pond Sanctuary & Little Visitors Modal */}
      {activeModal === 'visitors' && (
        <VisitorModal
          isOpen={true}
          onClose={() => setActiveModal('none')}
          activeVisitorType={activeVisitor?.type}
          befriendedVisitors={gameState.befriendedVisitors || getInitialBefriendedVisitors()}
          onRenameVisitor={handleRenameVisitor}
          onFeedVisitor={handleFeedVisitor}
          coins={gameState.coins}
        />
      )}

      {/* 9. Offline Catch Welcome Modal */}
      {offlineResult && (
        <OfflineProgressModal
          result={offlineResult}
          onClaim={() => setOfflineResult(null)}
        />
      )}

      {/* 11. Story Journal Modal */}
      {activeModal === 'storyJournal' && (
        <StoryJournalModal
          storyState={gameState.storyState || INITIAL_STORY_STATE}
          boatTier={gameState.boatTier || 1}
          totalFishCaught={gameState.lifetimeFishCaught}
          unlockedLocations={gameState.unlockedLocations}
          coins={gameState.coins}
          starPearls={gameState.starPearls}
          onClose={() => setActiveModal('none')}
          onTalkToCharacter={handleTalkToCharacter}
          onClaimQuestReward={handleClaimQuestReward}
          onReadPage={(pageId) => {
            setGameState(p => {
              const story = { ...(p.storyState || INITIAL_STORY_STATE) };
              if (!story.readPageIds.includes(pageId)) {
                story.readPageIds = [...story.readPageIds, pageId];
                return { ...p, storyState: story };
              }
              return p;
            });
          }}
        />
      )}

      {/* 12. Boat Shipyard Modal */}
      {activeModal === 'shipyard' && (
        <ShipyardModal
          currentBoatTier={gameState.boatTier || 1}
          coins={gameState.coins}
          onUpgradeBoat={handleUpgradeBoat}
          onClose={() => setActiveModal('none')}
        />
      )}

      {/* 13. Story Dialogue Modal */}
      {activeModal === 'storyDialogue' && activeDialogueChar && activeDialogue && (
        <StoryDialogueModal
          character={activeDialogueChar}
          dialogue={activeDialogue}
          onClose={() => {
            setActiveModal('none');
            setActiveDialogueChar(null);
            setActiveDialogue(null);
          }}
          onSelectOption={handleSelectDialogueOption}
        />
      )}

    </div>
  );
}
