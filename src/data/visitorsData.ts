import { VisitorType, BefriendedVisitor } from '../types/game';

export interface VisitorSpeciesDef {
  type: VisitorType;
  defaultName: string;
  speciesTitle: string;
  emoji: string;
  avatarBg: string;
  description: string;
  personality: string;
  favoriteFood: string;
  greetingQuote: string;
  happyQuote: string;
  lore: string;
  baseGift: {
    minCoins: number;
    maxCoins: number;
    chancePearl: number;
    specialItemName?: string;
  };
}

export const VISITORS_CONFIG: Record<VisitorType, VisitorSpeciesDef> = {
  frog: {
    type: 'frog',
    defaultName: 'Barnaby',
    speciesTitle: 'Pond Bullfrog',
    emoji: '🐸',
    avatarBg: 'from-emerald-600 to-green-700',
    description: 'A plump, contemplative bullfrog who loves perching on flat lily pads and giving low croaks.',
    personality: 'Calm, observant, and deeply appreciative of fat insects.',
    favoriteFood: 'Juicy Garden Worms 🪱',
    greetingQuote: '*Croooak* ...Ribbit! (Barnaby blinks slowly and nods in greeting.)',
    happyQuote: 'Ribbit! Ribbit! 💚 (Barnaby puffs his throat happily and kicks his webbed feet!)',
    lore: 'Local legends say Barnaby has sat upon the lily pads since the dawn of the pond, guarding underwater secrets.',
    baseGift: {
      minCoins: 250,
      maxCoins: 850,
      chancePearl: 0.15,
      specialItemName: 'Lilypad Dewdrop',
    },
  },
  turtle: {
    type: 'turtle',
    defaultName: 'Shelby',
    speciesTitle: 'Sunbathing Terrapin',
    emoji: '🐢',
    avatarBg: 'from-teal-700 to-emerald-800',
    description: 'An ancient, patient turtle with moss growing on her shell who moves with graceful serenity.',
    personality: 'Wisened, unhurried, and loves warm sunshine.',
    favoriteFood: 'Sun-Dried Pond Greens 🌿',
    greetingQuote: '*Gently raises head* Hello, young angler. Take your time today...',
    happyQuote: '*Pleased shell wiggles* You have a gentle heart. May your waters remain calm.',
    lore: 'Shelby remembers every fisherman who has ever visited this pond over the last eighty years.',
    baseGift: {
      minCoins: 400,
      maxCoins: 1200,
      chancePearl: 0.25,
      specialItemName: 'Polished River Pebble',
    },
  },
  duck: {
    type: 'duck',
    defaultName: 'Quackers',
    speciesTitle: 'Emerald Mallard',
    emoji: '🦆',
    avatarBg: 'from-amber-600 to-yellow-700',
    description: 'A spirited duck with iridescent green head plumage who glides across the water leaving smooth wakes.',
    personality: 'Chatty, enthusiastic, and relentless in pursuit of snacks.',
    favoriteFood: 'Toasted Breadcrumbs 🍞',
    greetingQuote: 'Quack quack! Got any crusts in that basket?!',
    happyQuote: 'QUACK! 🦆 (Quackers dunks his head under the water and wiggles his tail feathers!)',
    lore: 'Migrated from the northern mountain lakes but decided your pond had the highest crumb-to-effort ratio.',
    baseGift: {
      minCoins: 300,
      maxCoins: 950,
      chancePearl: 0.18,
      specialItemName: 'Lucky Emerald Feather',
    },
  },
  otter: {
    type: 'otter',
    defaultName: 'Ollie',
    speciesTitle: 'River Otter',
    emoji: '🦦',
    avatarBg: 'from-sky-700 to-indigo-800',
    description: 'A playful water acrobat who loves diving beneath the dock and showing off backward loop-de-loops.',
    personality: 'Energetic, mischievous, and affectionate.',
    favoriteFood: 'Crispy Fresh Minnow 🐟',
    greetingQuote: '*Squeeeak!* Look at this flip! Did you see it?!',
    happyQuote: '*Chitters with glee* (Ollie balances a sea pebble on his tummy and claps his paws!)',
    lore: 'Ollie knows all the deepest underwater tunnels connecting this pond to the surrounding river system.',
    baseGift: {
      minCoins: 500,
      maxCoins: 1800,
      chancePearl: 0.35,
      specialItemName: 'Glossy River Pearl',
    },
  },
  crab: {
    type: 'crab',
    defaultName: 'Pinchy',
    speciesTitle: 'Tidepool Hermit Crab',
    emoji: '🦀',
    avatarBg: 'from-rose-600 to-red-700',
    description: 'A tiny, spunky crab wearing a decorative spiral seashell who scuttles sideways along the wooden dock.',
    personality: 'Feisty, proud, and takes dock patrol very seriously.',
    favoriteFood: 'Crisp Sea Kelp Crisps 🥬',
    greetingQuote: '*Clack clack!* State your business at my dock!',
    happyQuote: '*Clickety clack!* (Pinchy does a joyful victory dance with both claws raised high!)',
    lore: 'Stowed away in an old tackle box from the Tropical Reef and now considers himself the dock foreman.',
    baseGift: {
      minCoins: 350,
      maxCoins: 1100,
      chancePearl: 0.20,
      specialItemName: 'Spiral Sea Shell',
    },
  },
  raccoon: {
    type: 'raccoon',
    defaultName: 'Bandit',
    speciesTitle: 'Suspicious Raccoon',
    emoji: '🦝',
    avatarBg: 'from-slate-700 to-zinc-900',
    description: 'A nocturnal rogue peeking from behind the dock pilings, eyeing your fish bucket with keen curiosity.',
    personality: 'Sly, humorous, but surprisingly generous when fed.',
    favoriteFood: 'Sweet Wild Marsh Berries 🫐',
    greetingQuote: '*Peeks around corner* Pssst... Hey pal. You got shiny things in that bucket?',
    happyQuote: '*Giggles in chitters* A deal is a deal! Take this shiny trinket I definitely legally acquired.',
    lore: 'Known throughout the township for swapping stolen car keys for dried fish. He means well.',
    baseGift: {
      minCoins: 750,
      maxCoins: 2500,
      chancePearl: 0.40,
      specialItemName: 'Shiny Brass Pocketwatch',
    },
  },
};

export function getInitialBefriendedVisitors(): Record<VisitorType, BefriendedVisitor> {
  const visitors: Record<string, BefriendedVisitor> = {};
  (Object.keys(VISITORS_CONFIG) as VisitorType[]).forEach(type => {
    const config = VISITORS_CONFIG[type];
    visitors[type] = {
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
  });
  return visitors as Record<VisitorType, BefriendedVisitor>;
}
