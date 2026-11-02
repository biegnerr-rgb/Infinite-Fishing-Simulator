import { UpgradeDef, PrestigeUpgradeDef } from '../types/game';

export const ROD_TIERS = [
  { level: 1, name: 'Bamboo Branch', power: '1.0x Value · Basic Cast', icon: '🎋' },
  { level: 2, name: 'Sturdy Ashwood Rod', power: '1.5x Value · Unlocks Crystal Lake', icon: '🎣' },
  { level: 3, name: 'Carbon Fiber Spool', power: '2.5x Value · Unlocks Reef Waters', icon: '🥢' },
  { level: 4, name: 'Prismatic Crystal Rod', power: '4.5x Value · Unlocks Midnight Abyss', icon: '💎' },
  { level: 5, name: 'Bioluminescent Angler Pole', power: '8.0x Value · Unlocks Alien Waters', icon: '🏮' },
  { level: 6, name: 'Neptune\'s Coral Spear', power: '15.0x Value · +15% Rare Catch', icon: '🔱' },
  { level: 7, name: 'Void-Weaver Rod', power: '28.0x Value · +25% Variant Chance', icon: '🌌' },
  { level: 8, name: 'Solar Flare Casting Pole', power: '50.0x Value · +35% Giant Size', icon: '☀️' },
  { level: 9, name: 'Celestial Star-String', power: '100.0x Value · Instant Nibble', icon: '✨' },
  { level: 10, name: 'Omniscient God-Rod', power: '250.0x Value · Transcendent Fisher', icon: '👑' },
];

export const UPGRADES: Record<string, UpgradeDef> = {
  fishing_rod: {
    id: 'fishing_rod',
    name: 'Fishing Rod',
    description: 'Upgrades your casting rod to reach deeper waters, increase catch market value, and handle legendary monsters.',
    category: 'rod',
    maxLevel: 10,
    baseCost: 80,
    costMultiplier: 3.2,
    getValue: (level: number) => {
      const multipliers = [1.0, 1.5, 2.5, 4.5, 8.0, 15.0, 28.0, 50.0, 100.0, 250.0];
      return multipliers[Math.min(level - 1, multipliers.length - 1)];
    },
    effectDescription: (level: number) => {
      const tier = ROD_TIERS[Math.min(level - 1, ROD_TIERS.length - 1)];
      return `${tier.name}: ${tier.power}`;
    },
  },
  lucky_bait: {
    id: 'lucky_bait',
    name: 'Lucky Bait',
    description: 'Infuses bait with fragrant luminous essence that attracts Rare, Epic, and Legendary species.',
    category: 'bait',
    maxLevel: 10,
    baseCost: 60,
    costMultiplier: 2.2,
    getValue: (level: number) => +(level * 0.12).toFixed(2), // +12% rare chance per level
    effectDescription: (level: number) => `+${(level * 12)}% Rare, Epic & Legendary odds`,
  },
  auto_fisher: {
    id: 'auto_fisher',
    name: 'Automatic Fisher',
    description: 'Sets up smart automated fishing floats that reel in catches even while you rest.',
    category: 'auto',
    maxLevel: 10,
    baseCost: 120,
    costMultiplier: 2.3,
    getValue: (level: number) => {
      if (level === 0) return 0;
      // 12s down to 1.5s
      const intervals = [12, 9, 7, 5.5, 4.2, 3.2, 2.5, 2.0, 1.7, 1.3];
      return intervals[Math.min(level - 1, intervals.length - 1)];
    },
    effectDescription: (level: number) => {
      if (level === 0) return 'Not installed (Manual only)';
      const intervals = [12, 9, 7, 5.5, 4.2, 3.2, 2.5, 2.0, 1.7, 1.3];
      return `Catches automatically every ${intervals[Math.min(level - 1, intervals.length - 1)]}s`;
    },
  },
  multiple_lines: {
    id: 'multiple_lines',
    name: 'Multiple Lines',
    description: 'Splits your rig into multiple high-tensile braided lines to hook multiple fish simultaneously.',
    category: 'auto',
    maxLevel: 5,
    baseCost: 500,
    costMultiplier: 4.5,
    getValue: (level: number) => level,
    effectDescription: (level: number) => `Hooks ${level} fish per automatic catch cycle`,
  },
  auto_seller: {
    id: 'auto_seller',
    name: 'Auto-Seller Drone',
    description: 'Deploys a merchant pelican drone that automatically trades duplicate catches for instant coins.',
    category: 'utility',
    maxLevel: 4,
    baseCost: 350,
    costMultiplier: 3.5,
    getValue: (level: number) => level,
    effectDescription: (level: number) => {
      const descriptions = [
        'Manual sales only',
        'Auto-sells duplicate Common fish',
        'Auto-sells duplicate Common & Uncommon fish',
        'Auto-sells duplicates + 10% market bonus',
        'Instant market teleportation + 25% bonus',
      ];
      return descriptions[Math.min(level, descriptions.length - 1)];
    },
  },
  pond_expansion: {
    id: 'pond_expansion',
    name: 'Pond Expansion & Dredging',
    description: 'Deepens the basin and plants lush aquatic flora, increasing live pond capacity and fish spawn diversity.',
    category: 'utility',
    maxLevel: 8,
    baseCost: 200,
    costMultiplier: 2.6,
    getValue: (level: number) => 30 + level * 15,
    effectDescription: (level: number) => `Pond inventory holds ${30 + level * 15} caught fish`,
  },
  offline_catcher: {
    id: 'offline_catcher',
    name: 'Deep Sleep Nets (Offline)',
    description: 'Maintains baited traps while you are away from the pond, welcoming you back with accumulated catches.',
    category: 'utility',
    maxLevel: 6,
    baseCost: 400,
    costMultiplier: 2.8,
    getValue: (level: number) => level * 4, // in hours
    effectDescription: (level: number) => {
      if (level === 0) return 'No offline earnings';
      return `Catches fish offline up to ${level * 4} hours at ${Math.min(100, 30 + level * 12)}% efficiency`;
    },
  },
  sonar_scanner: {
    id: 'sonar_scanner',
    name: 'Sonar Fish Finder',
    description: 'Scans the depths with acoustic radar, pinging giant shadows and warning you when legendary fish approach.',
    category: 'utility',
    maxLevel: 3,
    baseCost: 1500,
    costMultiplier: 4.0,
    getValue: (level: number) => level,
    effectDescription: (level: number) => {
      if (level === 0) return 'Inactive';
      if (level === 1) return 'Visual ripples highlight large fish shadows';
      if (level === 2) return 'Acoustic ping warns of Epic and Legendary fish';
      return 'Guaranteed +50% Giant variant chance on targeted casts';
    },
  },
};

export const PRESTIGE_UPGRADES: Record<string, PrestigeUpgradeDef> = {
  eternal_luck: {
    id: 'eternal_luck',
    name: 'Eternal Luck Shrine',
    description: 'Permanent ancestral blessing that permanently boosts Rare, Epic, and Legendary catch rates across all resets.',
    maxLevel: 10,
    baseCost: 1,
    costMultiplier: 1.8,
    effect: (level: number) => level * 0.15,
    effectDescription: (level: number) => `+${level * 15}% permanent rare species discovery rate`,
  },
  cosmic_essence: {
    id: 'cosmic_essence',
    name: 'Cosmic Essence Prism',
    description: 'Infuses water across all realms with starlight, drastically boosting the appearance of special fish variants.',
    maxLevel: 10,
    baseCost: 2,
    costMultiplier: 2.0,
    effect: (level: number) => level * 0.25,
    effectDescription: (level: number) => `+${level * 25}% chance for Golden, Cosmic, & Rainbow mutations`,
  },
  tide_caller: {
    id: 'tide_caller',
    name: 'Tide Caller Horn',
    description: 'Summons cosmic events twice as frequently and extends event durations.',
    maxLevel: 5,
    baseCost: 3,
    costMultiplier: 2.2,
    effect: (level: number) => level * 0.2,
    effectDescription: (level: number) => `+${level * 20}% event spawn rate & +${level * 10}s event duration`,
  },
  pearl_harvester: {
    id: 'pearl_harvester',
    name: 'Star Pearl Harvester',
    description: 'Legendary and Secret fish have a chance to yield permanent Star Pearls directly upon being caught.',
    maxLevel: 5,
    baseCost: 5,
    costMultiplier: 2.5,
    effect: (level: number) => level * 0.08,
    effectDescription: (level: number) => `${level * 8}% chance for Epic+ fish to grant Star Pearls`,
  },
  master_fisherman: {
    id: 'master_fisherman',
    name: 'Grandmaster Intuition',
    description: 'Begin every new Ascension with starting bonus coins and 2 free rod tiers.',
    maxLevel: 5,
    baseCost: 4,
    costMultiplier: 2.4,
    effect: (level: number) => level,
    effectDescription: (level: number) => `Start new resets with ${level * 500} coins and +${level} Rod Tiers`,
  },
};
