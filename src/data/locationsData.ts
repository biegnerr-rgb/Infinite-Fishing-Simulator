import { LocationDef } from '../types/game';

export const LOCATIONS: LocationDef[] = [
  {
    id: 'little_pond',
    name: 'Little Pond',
    subtitle: 'A quiet, sun-dappled beginner haven',
    unlockCost: 0,
    description: 'Surrounded by weeping willows, floating lily pads, and blooming water clover. Calm waters brimming with friendly minnows and sunfish.',
    waterColors: ['#0f766e', '#115e59', '#134e4a'], // lush emerald-teal
    bedColor: '#064e3b',
    particleType: 'petals',
    accentTheme: 'emerald',
    minRodLevel: 1,
    catchValueMultiplier: 1.0,
  },
  {
    id: 'crystal_lake',
    name: 'Crystal Lake',
    subtitle: 'Alpine waters of mirror purity',
    unlockCost: 2500,
    description: 'High in the snow-capped peaks, this ice-cold pristine lake reflects towering pines and sparkling quartz cliffs. Home to rainbow trout and diamond sturgeon.',
    waterColors: ['#0284c7', '#0369a1', '#075985'], // crystal cyan-blue
    bedColor: '#0c4a6e',
    particleType: 'sparkles',
    accentTheme: 'cyan',
    minRodLevel: 2,
    catchValueMultiplier: 2.2,
  },
  {
    id: 'tropical_reef',
    name: 'Tropical Reef',
    subtitle: 'Warm turquoise lagoon and coral arches',
    unlockCost: 15000,
    description: 'Sun-warmed azure currents washing over vibrant brain coral, swaying sea anemones, and playful rays. Teeming with exotic reef dwellers.',
    waterColors: ['#0ea5e9', '#0284c7', '#0369a1'], // turquoise azure
    bedColor: '#075985',
    particleType: 'bubbles',
    accentTheme: 'amber',
    minRodLevel: 3,
    catchValueMultiplier: 5.0,
  },
  {
    id: 'midnight_deep',
    name: 'Midnight Deep',
    subtitle: 'Bioluminescent trench beyond the abyss',
    unlockCost: 100000,
    description: 'Sunlight never pierces this silent oceanic trench. Deep hydrothermal vents pulse with heat while glowing anglerfish and giant squids drift in the dark.',
    waterColors: ['#1e1b4b', '#0f172a', '#020617'], // obsidian midnight indigo
    bedColor: '#030712',
    particleType: 'abyssal_spores',
    accentTheme: 'indigo',
    minRodLevel: 4,
    catchValueMultiplier: 14.0,
  },
  {
    id: 'alien_waters',
    name: 'Alien Waters',
    subtitle: 'Cosmic ocean orbiting a celestial singularity',
    unlockCost: 1000000,
    description: 'Zero-gravity iridescent nebula liquid rippling across the stars. Time flows strangely here, and celestial dragons weave constellations through space.',
    waterColors: ['#4c1d95', '#312e81', '#18181b'], // violet astral void
    bedColor: '#1e1b4b',
    particleType: 'stardust',
    accentTheme: 'fuchsia',
    minRodLevel: 5,
    catchValueMultiplier: 45.0,
  },
];
