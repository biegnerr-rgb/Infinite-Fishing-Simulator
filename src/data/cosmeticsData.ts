export interface CosmeticItem {
  id: string;
  name: string;
  type: 'hat' | 'outfit' | 'hair' | 'facialHair' | 'skin';
  description: string;
  costCoins: number;
  costPearls: number;
  unlockedByDefault: boolean;
  color: string;
  accentColor?: string;
  icon: string;
  isHalloween?: boolean;
}

export interface FishermanCustomization {
  name: string;
  skinId: string;
  hairId: string;
  facialHairId: string;
  hatId: string;
  outfitId: string;
  unlockedCosmeticIds: string[];
}

export const SKIN_TONES: CosmeticItem[] = [
  { id: 'skin_peach', name: 'Peach', type: 'skin', description: 'Fair rosy skin tone', costCoins: 0, costPearls: 0, unlockedByDefault: true, color: '#fbcfe8', icon: '🎨' },
  { id: 'skin_warm', name: 'Warm Tan', type: 'skin', description: 'Sun-kissed river angler', costCoins: 0, costPearls: 0, unlockedByDefault: true, color: '#fcd34d', icon: '🎨' },
  { id: 'skin_olive', name: 'Olive Bronze', type: 'skin', description: 'Weathered salt fisherman', costCoins: 0, costPearls: 0, unlockedByDefault: true, color: '#d97706', icon: '🎨' },
  { id: 'skin_rich', name: 'Deep Cocoa', type: 'skin', description: 'Rich deep complexion', costCoins: 0, costPearls: 0, unlockedByDefault: true, color: '#78350f', icon: '🎨' },
  { id: 'skin_cosmic', name: 'Cosmic Violet', type: 'skin', description: 'Glowing ethereal alien tint', costCoins: 5000, costPearls: 2, unlockedByDefault: false, color: '#c084fc', icon: '✨' },
  // Halloween Special Skins
  { id: 'skin_zombie', name: 'Zombie Slime', type: 'skin', description: 'Creepy rotting graveyard green', costCoins: 666, costPearls: 0, unlockedByDefault: false, color: '#84cc16', icon: '🧟', isHalloween: true },
  { id: 'skin_vampire', name: 'Vampire Pale', type: 'skin', description: 'Eerily bloodless moonlit marble', costCoins: 1000, costPearls: 0, unlockedByDefault: false, color: '#f8fafc', icon: '🧛', isHalloween: true },
  { id: 'skin_spectral', name: 'Spectral Ember', type: 'skin', description: 'Glowing jack-o-lantern orange skin', costCoins: 3100, costPearls: 1, unlockedByDefault: false, color: '#fb923c', icon: '🎃', isHalloween: true },
];

export const HAIR_STYLES: CosmeticItem[] = [
  { id: 'hair_short', name: 'Neat Crop', type: 'hair', description: 'Practical and tidy', costCoins: 0, costPearls: 0, unlockedByDefault: true, color: '#451a03', icon: '✂️' },
  { id: 'hair_messy', name: 'Windswept Tousle', type: 'hair', description: 'Ruffled by lake breezes', costCoins: 0, costPearls: 0, unlockedByDefault: true, color: '#78350f', icon: '💨' },
  { id: 'hair_ponytail', name: 'Angler Ponytail', type: 'hair', description: 'Tied back with sea cord', costCoins: 350, costPearls: 0, unlockedByDefault: false, color: '#1e293b', icon: '🎀' },
  { id: 'hair_silver', name: 'Silver Fox Waves', type: 'hair', description: 'Wise seasoned waves', costCoins: 800, costPearls: 0, unlockedByDefault: false, color: '#94a3b8', icon: '🌊' },
  { id: 'hair_cosmic', name: 'Stardust Nebula Mane', type: 'hair', description: 'Twinkling galactic locks', costCoins: 8000, costPearls: 3, unlockedByDefault: false, color: '#ec4899', icon: '🌌' },
  // Halloween Hair
  { id: 'hair_witch', name: 'Wicked Witch Hag Tresses', type: 'hair', description: 'Wild jagged midnight purple locks', costCoins: 1200, costPearls: 0, unlockedByDefault: false, color: '#581c87', icon: '🧙‍♀️', isHalloween: true },
  { id: 'hair_franken', name: 'Franken Flat-Top', type: 'hair', description: 'High bristling monster hair with neck bolts', costCoins: 1500, costPearls: 0, unlockedByDefault: false, color: '#18181b', icon: '🧟', isHalloween: true },
];

export const FACIAL_HAIR_STYLES: CosmeticItem[] = [
  { id: 'beard_clean', name: 'Clean Shaven', type: 'facialHair', description: 'Smooth face', costCoins: 0, costPearls: 0, unlockedByDefault: true, color: 'transparent', icon: '🪒' },
  { id: 'beard_stubble', name: 'Cozy Stubble', type: 'facialHair', description: 'A few days on the lake', costCoins: 0, costPearls: 0, unlockedByDefault: true, color: '#57534e', icon: '🧔' },
  { id: 'beard_mustache', name: 'Captain\'s Walrus Stache', type: 'facialHair', description: 'Dignified sea dog mustache', costCoins: 400, costPearls: 0, unlockedByDefault: false, color: '#78350f', icon: '🥸' },
  { id: 'beard_full', name: 'Old Salt Full Beard', type: 'facialHair', description: 'Thick braided fisherman beard', costCoins: 1200, costPearls: 0, unlockedByDefault: false, color: '#e2e8f0', icon: '🧔‍♂️' },
  { id: 'beard_glowing', name: 'Bioluminescent Whiskers', type: 'facialHair', description: 'Glows softly in the deep midnight', costCoins: 10000, costPearls: 4, unlockedByDefault: false, color: '#38bdf8', icon: '✨' },
  // Halloween Facial Hair
  { id: 'beard_vampire', name: 'Count\'s Pointed Goatee', type: 'facialHair', description: 'Sharp aristocratic demonic goatee', costCoins: 666, costPearls: 0, unlockedByDefault: false, color: '#09090b', icon: '🧛', isHalloween: true },
  { id: 'beard_witcher', name: 'Ancient Necromancer Beard', type: 'facialHair', description: 'Long spectral ghostly white whiskers', costCoins: 1800, costPearls: 0, unlockedByDefault: false, color: '#cbd5e1', icon: '🧙‍♂️', isHalloween: true },
];

export const HATS: CosmeticItem[] = [
  { id: 'hat_straw', name: 'Woven Straw Hat', type: 'hat', description: 'Wide-brimmed protection from afternoon sun', costCoins: 0, costPearls: 0, unlockedByDefault: true, color: '#fde047', accentColor: '#ca8a04', icon: '👒' },
  { id: 'hat_bucket', name: 'Tackle Bucket Hat', type: 'hat', description: 'Classic green canvas with decorative fishing fly pinned', costCoins: 250, costPearls: 0, unlockedByDefault: false, color: '#15803d', accentColor: '#fbbf24', icon: '🧢' },
  { id: 'hat_beanie', name: 'Cozy Fisherman Beanie', type: 'hat', description: 'Ribbed knit wool for crisp mornings', costCoins: 600, costPearls: 0, unlockedByDefault: false, color: '#ea580c', accentColor: '#c2410c', icon: '🧶' },
  { id: 'hat_captain', name: 'Grand Captain Cap', type: 'hat', description: 'Gold embroidered maritime captain cap', costCoins: 2500, costPearls: 1, unlockedByDefault: false, color: '#0f172a', accentColor: '#fbbf24', icon: '⚓' },
  { id: 'hat_diver', name: 'Brass Diving Helmet', type: 'hat', description: 'Heavy antique deep-sea bronze helmet', costCoins: 15000, costPearls: 5, unlockedByDefault: false, color: '#b45309', accentColor: '#38bdf8', icon: '🤿' },
  { id: 'hat_crown', name: 'Golden Fisher King Crown', type: 'hat', description: 'Jeweled crown forged for legendary masters', costCoins: 50000, costPearls: 10, unlockedByDefault: false, color: '#fbbf24', accentColor: '#ef4444', icon: '👑' },
  { id: 'hat_none', name: 'No Hat', type: 'hat', description: 'Let your hair blow freely in the wind', costCoins: 0, costPearls: 0, unlockedByDefault: true, color: 'transparent', icon: '❌' },
  // Halloween Special Hats
  { id: 'hat_pumpkin', name: 'Jack-o\'-Lantern Mask', type: 'hat', description: 'Glowing carved pumpkin helmet with warm candlelight flickers', costCoins: 666, costPearls: 0, unlockedByDefault: false, color: '#ea580c', accentColor: '#facc15', icon: '🎃', isHalloween: true },
  { id: 'hat_witch', name: 'Wicked Witch Hat', type: 'hat', description: 'Tall crooked brim woven with spiders and purple silk ribbon', costCoins: 1313, costPearls: 0, unlockedByDefault: false, color: '#2e1065', accentColor: '#a855f7', icon: '🧙‍♀️', isHalloween: true },
  { id: 'hat_skeleton', name: 'Skull Mask', type: 'hat', description: 'Bone-white skull with glowing neon green eye sockets', costCoins: 2400, costPearls: 0, unlockedByDefault: false, color: '#f8fafc', accentColor: '#4ade80', icon: '💀', isHalloween: true },
  { id: 'hat_vampire', name: 'Count\'s Bat Coronet', type: 'hat', description: 'Midnight crown styled with flying bats and ruby gem', costCoins: 3500, costPearls: 1, unlockedByDefault: false, color: '#0f172a', accentColor: '#dc2626', icon: '🦇', isHalloween: true },
  { id: 'hat_ghost', name: 'Spooky Bed Sheet Hood', type: 'hat', description: 'Classic sheet with cut-out eye holes. Boo!', costCoins: 500, costPearls: 0, unlockedByDefault: false, color: '#f1f5f9', accentColor: '#94a3b8', icon: '👻', isHalloween: true },
];

export const OUTFITS: CosmeticItem[] = [
  { id: 'outfit_overalls', name: 'Denim River Overalls', type: 'outfit', description: 'Sturdy blue dungarees with brass buckles over red plaid', costCoins: 0, costPearls: 0, unlockedByDefault: true, color: '#2563eb', accentColor: '#dc2626', icon: '👖' },
  { id: 'outfit_slicker', name: 'Yellow Storm Slicker', type: 'outfit', description: 'Iconic bright yellow waterproof raincoat', costCoins: 500, costPearls: 0, unlockedByDefault: false, color: '#eab308', accentColor: '#ca8a04', icon: '🧥' },
  { id: 'outfit_vest', name: 'Pocket Tackle Vest', type: 'outfit', description: 'Khaki vest packed with lures, hooks, and snacks', costCoins: 1500, costPearls: 0, unlockedByDefault: false, color: '#78716c', accentColor: '#16a34a', icon: '🦺' },
  { id: 'outfit_hawaiian', name: 'Tropical Floral Shirt', type: 'outfit', description: 'Vibrant hibiscus flowers and ocean waves', costCoins: 3500, costPearls: 1, unlockedByDefault: false, color: '#06b6d4', accentColor: '#f43f5e', icon: '🌺' },
  { id: 'outfit_midnight', name: 'Abyssal Duster Coat', type: 'outfit', description: 'Deep indigo coat with bioluminescent runes', costCoins: 20000, costPearls: 5, unlockedByDefault: false, color: '#1e1b4b', accentColor: '#818cf8', icon: '🌌' },
  { id: 'outfit_celestial', name: 'Cosmic Starlight Robe', type: 'outfit', description: 'Woven from spun interstellar nebulae and stardust', costCoins: 80000, costPearls: 12, unlockedByDefault: false, color: '#4c1d95', accentColor: '#f472b6', icon: '🪐' },
  // Halloween Special Outfits
  { id: 'outfit_pumpkin', name: 'Pumpkin Patch Robes', type: 'outfit', description: 'Autumnal pumpkin orange tunic with tangled green creeper vines', costCoins: 999, costPearls: 0, unlockedByDefault: false, color: '#ea580c', accentColor: '#15803d', icon: '🎃', isHalloween: true },
  { id: 'outfit_vampire', name: 'Dracula\'s Velvet Cape', type: 'outfit', description: 'Aristocratic tuxedo with high red-lined vampire cape', costCoins: 3100, costPearls: 1, unlockedByDefault: false, color: '#09090b', accentColor: '#b91c1c', icon: '🧛', isHalloween: true },
  { id: 'outfit_skeleton', name: 'Skeleton Bone Suit', type: 'outfit', description: 'Glow-in-the-dark painted ribs and arm bones', costCoins: 2800, costPearls: 0, unlockedByDefault: false, color: '#020617', accentColor: '#86efac', icon: '💀', isHalloween: true },
  { id: 'outfit_frankenstein', name: 'Monster\'s Stitched Coat', type: 'outfit', description: 'Tattered tweed suit sewn together with thick black stitches', costCoins: 2000, costPearls: 0, unlockedByDefault: false, color: '#3f6212', accentColor: '#71717a', icon: '🧟', isHalloween: true },
  { id: 'outfit_ghost', name: 'Phantasmal Ghost Robe', type: 'outfit', description: 'Billowing ethereal white cloth that floats in the breeze', costCoins: 1500, costPearls: 0, unlockedByDefault: false, color: '#f8fafc', accentColor: '#38bdf8', icon: '👻', isHalloween: true },
];

export const DEFAULT_CUSTOMIZATION: FishermanCustomization = {
  name: 'Old Pete',
  skinId: 'skin_warm',
  hairId: 'hair_short',
  facialHairId: 'beard_stubble',
  hatId: 'hat_straw',
  outfitId: 'outfit_overalls',
  unlockedCosmeticIds: [
    'skin_peach', 'skin_warm', 'skin_olive', 'skin_rich',
    'hair_short', 'hair_messy',
    'beard_clean', 'beard_stubble',
    'hat_straw', 'hat_none',
    'outfit_overalls',
  ],
};
