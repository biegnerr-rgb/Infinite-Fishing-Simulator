import React, { useRef, useEffect, useCallback, useState } from 'react';
import { LocationDef, FishSpecies, FishVariant, ActiveEvent, PondZone, TimeOfDay, WeatherType, SeasonType, VisitorType, ActiveVisitorScene } from '../types/game';
import { VISITORS_CONFIG } from '../data/visitorsData';
import { sound } from '../utils/audio';
import {
  FishermanCustomization,
  DEFAULT_CUSTOMIZATION,
  SKIN_TONES,
  HAIR_STYLES,
  FACIAL_HAIR_STYLES,
  HATS,
  OUTFITS,
} from '../data/cosmeticsData';

interface SwimmingFish {
  id: string;
  species: FishSpecies;
  variant: FishVariant;
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetX: number;
  targetY: number;
  speed: number;
  size: number;
  angle: number;
  wigglePhase: number;
  depth: number; // 0 (surface) to 1 (deep)
  color: string;
  glow: string;
}

interface WaterRipple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  opacity: number;
  speed: number;
  color?: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  color: string;
  life: number;
  maxLife: number;
}

interface LilyPad {
  x: number;
  y: number;
  radius: number;
  angle: number;
  hasFlower: boolean;
  flowerColor: string;
}

interface SeabedDecor {
  id: string;
  type: 'coral_branch' | 'coral_brain' | 'coral_fan' | 'anemone' | 'starfish' | 'weed' | 'crystal' | 'deep_vent' | 'rock';
  x: number; // 0 to 1
  y: number; // 0.72 to 0.96
  size: number;
  color: string;
  accentColor?: string;
  angle?: number;
  swaySpeed?: number;
  swayPhase?: number;
}

interface SchoolBoid {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  wigglePhase: number;
}

interface FishSchool {
  leaderX: number;
  leaderY: number;
  targetX: number;
  targetY: number;
  speed: number;
  color: string;
  accentColor: string;
  glow?: string;
  boids: SchoolBoid[];
}

interface TitanShadow {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  speed: number;
  size: number;
  angle: number;
  type: 'shark' | 'whale' | 'narwhal' | 'megalodon' | 'kraken';
  opacity: number;
  active: boolean;
}

interface PondCanvasProps {
  location: LocationDef;
  availableFish: FishSpecies[];
  aquariumFish?: Array<{ species: FishSpecies; variant: FishVariant }>;
  isAquariumMode?: boolean;
  activeEvents: ActiveEvent[];
  isFishing: boolean;
  fishingState: 'idle' | 'casting' | 'waiting' | 'nibble' | 'hooked' | 'reeling';
  customization?: FishermanCustomization;
  boatTier?: number;
  bubblesMessage?: string;
  hasFloatingBottle?: boolean;
  timeOfDay?: TimeOfDay;
  weather?: WeatherType;
  season?: SeasonType;
  selectedZone?: PondZone;
  activeVisitor?: ActiveVisitorScene | null;
  visitorName?: string;
  onManualCast: (clickX?: number, clickY?: number, zone?: PondZone) => void;
  onReelIn: () => void;
  onCollectChest?: () => void;
  onCollectRelic?: () => void;
  onCollectBottle?: () => void;
  onInteractBubbles?: () => void;
  onInteractVisitor?: (type: VisitorType) => void;
}

export const PondCanvas: React.FC<PondCanvasProps> = ({
  location,
  availableFish,
  aquariumFish = [],
  isAquariumMode = false,
  activeEvents,
  isFishing,
  fishingState,
  customization = DEFAULT_CUSTOMIZATION,
  boatTier = 1,
  bubblesMessage,
  hasFloatingBottle = false,
  timeOfDay = 'day',
  weather = 'clear',
  season = 'spring',
  selectedZone = 'deep_water',
  activeVisitor,
  visitorName,
  onManualCast,
  onReelIn,
  onCollectChest,
  onCollectRelic,
  onCollectBottle,
  onInteractBubbles,
  onInteractVisitor,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const customRef = useRef<FishermanCustomization>(customization);
  customRef.current = customization;

  const [hoverInfo, setHoverInfo] = useState<{ zone: PondZone; x: number; y: number } | null>(null);
  const castTargetPosRef = useRef<{ x: number; y: number } | null>(null);
  const visitorPosRef = useRef<{ x: number; y: number }>({ x: 0.25, y: 0.4 });
  const bottlePosRef = useRef<{ x: number; y: number; bobOffset: number; active: boolean }>({
    x: 0.48,
    y: 0.65,
    bobOffset: 0,
    active: false,
  });
  const bubblesPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Simulation state refs (so 60fps loop runs without React re-renders)
  const bobberRef = useRef<{
    x: number;
    y: number;
    targetX: number;
    targetY: number;
    progress: number;
    submerged: number;
    active: boolean;
  }>({
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0,
    progress: 1,
    submerged: 0,
    active: false,
  });

  const fishListRef = useRef<SwimmingFish[]>([]);
  const ripplesRef = useRef<WaterRipple[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const lilyPadsRef = useRef<LilyPad[]>([]);
  const chestPosRef = useRef<{ x: number; y: number; active: boolean; bobOffset: number }>({
    x: 0.25,
    y: 0.35,
    active: false,
    bobOffset: 0,
  });
  const relicPosRef = useRef<{ x: number; y: number; active: boolean; bobOffset: number }>({
    x: 0.75,
    y: 0.4,
    active: false,
    bobOffset: 0,
  });

  const seabedDecorRef = useRef<SeabedDecor[]>([]);
  const schoolsRef = useRef<FishSchool[]>([]);
  const titanShadowRef = useRef<TitanShadow>({
    x: -0.3,
    y: 0.65,
    targetX: 1.3,
    targetY: 0.6,
    speed: 0.00018,
    size: 160,
    angle: 0,
    type: 'shark',
    opacity: 0.22,
    active: true,
  });

  const animationFrameId = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());
  const globalTimeRef = useRef<number>(0);

  // Initialize lily pads & flora
  useEffect(() => {
    const pads: LilyPad[] = [];
    const count = location.id === 'little_pond' ? 12 : location.id === 'crystal_lake' ? 6 : 4;
    for (let i = 0; i < count; i++) {
      pads.push({
        x: 0.1 + Math.random() * 0.8,
        y: 0.15 + Math.random() * 0.7,
        radius: 18 + Math.random() * 22,
        angle: Math.random() * Math.PI * 2,
        hasFlower: Math.random() > 0.45,
        flowerColor: Math.random() > 0.5 ? '#f472b6' : '#ffffff',
      });
    }
    lilyPadsRef.current = pads;
  }, [location.id]);

  // Initialize seabed decor (coral reefs, sea fans, anemones, crystals, vents)
  useEffect(() => {
    const decor: SeabedDecor[] = [];
    const locId = location.id;

    if (locId === 'tropical_reef') {
      // Vibrant coral reef garden: branching corals, brain corals, sea fans, anemones, starfish
      const count = 22;
      const coralColors = ['#f43f5e', '#ec4899', '#f97316', '#fbbf24', '#06b6d4', '#14b8a6', '#a855f7'];
      for (let i = 0; i < count; i++) {
        const typeRoll = Math.random();
        const type =
          typeRoll < 0.35 ? 'coral_branch' :
          typeRoll < 0.55 ? 'coral_brain' :
          typeRoll < 0.75 ? 'coral_fan' :
          typeRoll < 0.90 ? 'anemone' : 'starfish';

        const color = coralColors[i % coralColors.length];
        const accent = coralColors[(i + 2) % coralColors.length];
        decor.push({
          id: `coral_${i}`,
          type,
          x: 0.03 + (i / count) * 0.92 + (Math.random() - 0.5) * 0.04,
          y: 0.76 + Math.random() * 0.18,
          size: type === 'coral_branch' ? 36 + Math.random() * 32 :
                type === 'coral_fan' ? 40 + Math.random() * 28 :
                type === 'coral_brain' ? 24 + Math.random() * 20 :
                type === 'anemone' ? 20 + Math.random() * 16 : 14 + Math.random() * 10,
          color,
          accentColor: accent,
          angle: (Math.random() - 0.5) * 0.3,
          swaySpeed: 1.2 + Math.random() * 1.5,
          swayPhase: Math.random() * Math.PI * 2,
        });
      }
    } else if (locId === 'midnight_deep') {
      // Abyssal hydrothermal vents, deep sea bioluminescent sponges, glowing crystals
      const count = 16;
      for (let i = 0; i < count; i++) {
        const typeRoll = Math.random();
        const type = typeRoll < 0.35 ? 'deep_vent' : typeRoll < 0.7 ? 'crystal' : 'rock';
        decor.push({
          id: `abyss_${i}`,
          type,
          x: 0.05 + (i / count) * 0.9 + (Math.random() - 0.5) * 0.05,
          y: 0.78 + Math.random() * 0.16,
          size: type === 'deep_vent' ? 44 + Math.random() * 24 : 22 + Math.random() * 20,
          color: type === 'deep_vent' ? '#334155' : type === 'crystal' ? '#06b6d4' : '#1e293b',
          accentColor: type === 'deep_vent' ? '#f97316' : '#a855f7',
          swaySpeed: 0.8 + Math.random() * 0.8,
          swayPhase: Math.random() * Math.PI * 2,
        });
      }
    } else if (locId === 'crystal_lake') {
      // Shimmering submerged crystals, smooth stones, and underwater lake reeds
      const count = 18;
      for (let i = 0; i < count; i++) {
        const type = i % 2 === 0 ? 'crystal' : i % 3 === 0 ? 'weed' : 'rock';
        decor.push({
          id: `lake_${i}`,
          type,
          x: 0.04 + (i / count) * 0.92 + (Math.random() - 0.5) * 0.04,
          y: 0.78 + Math.random() * 0.16,
          size: type === 'crystal' ? 28 + Math.random() * 26 : 22 + Math.random() * 22,
          color: type === 'crystal' ? '#38bdf8' : type === 'weed' ? '#0d9488' : '#475569',
          accentColor: '#e0f2fe',
          swaySpeed: 1.0 + Math.random() * 1.2,
          swayPhase: Math.random() * Math.PI * 2,
        });
      }
    } else if (locId === 'alien_waters') {
      // Cosmic spires, pulsing void crystals, exotic glowing polyps
      const count = 18;
      for (let i = 0; i < count; i++) {
        const type = i % 2 === 0 ? 'crystal' : 'anemone';
        decor.push({
          id: `alien_${i}`,
          type,
          x: 0.04 + (i / count) * 0.92,
          y: 0.78 + Math.random() * 0.16,
          size: 30 + Math.random() * 26,
          color: i % 2 === 0 ? '#c084fc' : '#22c55e',
          accentColor: '#f43f5e',
          swaySpeed: 1.4 + Math.random() * 1.5,
          swayPhase: Math.random() * Math.PI * 2,
        });
      }
    } else {
      // Little Pond: freshwater reeds, gentle river stones, aquatic moss
      const count = 16;
      for (let i = 0; i < count; i++) {
        const type = i % 2 === 0 ? 'weed' : 'rock';
        decor.push({
          id: `pond_${i}`,
          type,
          x: 0.05 + (i / count) * 0.9,
          y: 0.78 + Math.random() * 0.16,
          size: type === 'weed' ? 34 + Math.random() * 24 : 20 + Math.random() * 18,
          color: type === 'weed' ? '#15803d' : '#64748b',
          accentColor: '#4ade80',
          swaySpeed: 1.1 + Math.random() * 1.0,
          swayPhase: Math.random() * Math.PI * 2,
        });
      }
    }
    seabedDecorRef.current = decor;
  }, [location.id]);

  // Initialize schools of fast-swimming baitfish
  useEffect(() => {
    const schools: FishSchool[] = [];
    const locId = location.id;

    const schoolThemes: Array<{ color: string; accent: string; glow?: string }> = locId === 'tropical_reef'
      ? [
          { color: '#38bdf8', accent: '#fef08a' }, // Neon blue/yellow damselfish
          { color: '#fbbf24', accent: '#fb923c' }, // Yellow tang school
        ]
      : locId === 'crystal_lake'
      ? [
          { color: '#93c5fd', accent: '#ffffff' }, // Silver lake smelt
          { color: '#67e8f9', accent: '#a5f3fc' }, // Glacier minnow
        ]
      : locId === 'midnight_deep'
      ? [
          { color: '#06b6d4', accent: '#22d3ee', glow: '#0891b2' }, // Bioluminescent lanternfish
          { color: '#a855f7', accent: '#e879f9', glow: '#9333ea' }, // Deep phantom fry
        ]
      : locId === 'alien_waters'
      ? [
          { color: '#e879f9', accent: '#38bdf8', glow: '#c084fc' }, // Cosmic spark boids
          { color: '#34d399', accent: '#a7f3d0', glow: '#059669' }, // Nebula swarm
        ]
      : [
          { color: '#f59e0b', accent: '#fef3c7' }, // Golden pond minnows
          { color: '#84cc16', accent: '#d9f99d' }, // Freshwater guppies
        ];

    schoolThemes.forEach((theme, sIdx) => {
      const boids: SchoolBoid[] = [];
      const leaderX = 0.2 + sIdx * 0.4;
      const leaderY = 0.35 + sIdx * 0.2;
      const boidCount = 8;
      for (let b = 0; b < boidCount; b++) {
        boids.push({
          x: leaderX + (Math.random() - 0.5) * 0.08,
          y: leaderY + (Math.random() - 0.5) * 0.06,
          vx: 0,
          vy: 0,
          angle: 0,
          wigglePhase: Math.random() * Math.PI * 2,
        });
      }
      schools.push({
        leaderX,
        leaderY,
        targetX: 0.15 + Math.random() * 0.7,
        targetY: 0.25 + Math.random() * 0.5,
        speed: 0.00075 + Math.random() * 0.0004,
        color: theme.color,
        accentColor: theme.accent,
        glow: theme.glow,
        boids,
      });
    });
    schoolsRef.current = schools;
  }, [location.id]);

  // Re-configure titan deep shadow based on location
  useEffect(() => {
    const locId = location.id;
    let type: 'shark' | 'whale' | 'narwhal' | 'megalodon' | 'kraken' = 'shark';
    let size = 150;
    if (locId === 'tropical_reef') {
      type = Math.random() > 0.4 ? 'shark' : 'whale';
      size = type === 'shark' ? 140 : 200;
    } else if (locId === 'crystal_lake') {
      type = 'narwhal';
      size = 145;
    } else if (locId === 'midnight_deep') {
      type = Math.random() > 0.5 ? 'megalodon' : 'whale';
      size = 210;
    } else if (locId === 'alien_waters') {
      type = 'whale';
      size = 230;
    } else {
      type = 'shark';
      size = 110;
    }

    titanShadowRef.current = {
      x: -0.2,
      y: 0.55 + Math.random() * 0.2,
      targetX: 1.25,
      targetY: 0.55 + Math.random() * 0.2,
      speed: 0.00018 + Math.random() * 0.0001,
      size,
      angle: 0,
      type,
      opacity: locId === 'midnight_deep' ? 0.28 : 0.20,
      active: true,
    };
  }, [location.id]);

  // Maintain population of swimming fish (more fish in pond with apex sizing)
  useEffect(() => {
    const desiredFishCount = isAquariumMode ? Math.max(8, aquariumFish.length) : 20;
    const currentList = fishListRef.current;
    const updated: SwimmingFish[] = [];

    for (let i = 0; i < desiredFishCount; i++) {
      let species: FishSpecies;
      let variant: FishVariant = 'Standard';

      if (isAquariumMode && aquariumFish.length > 0) {
        const picked = aquariumFish[i % aquariumFish.length];
        species = picked.species;
        variant = picked.variant;
      } else {
        const pool = availableFish.length > 0 ? availableFish : [speciesPlaceholder];
        species = pool[Math.floor(Math.random() * pool.length)];
        const varRoll = Math.random();
        if (varRoll < 0.05) variant = 'Golden';
        else if (varRoll < 0.10) variant = 'Glowing';
        else if (varRoll < 0.14) variant = 'Rainbow';
      }

      const isTitan = (species.minRodLevel && species.minRodLevel >= 4) || species.maxSize >= 300;
      const baseFishSize = isTitan ? (48 + Math.random() * 28) : (22 + Math.random() * 18);

      // Keep existing fish or create new
      const existing = currentList[i];
      if (existing) {
        existing.species = species;
        existing.variant = variant;
        existing.size = baseFishSize;
        updated.push(existing);
      } else {
        updated.push({
          id: `fish_${i}_${Date.now()}`,
          species,
          variant,
          x: Math.random(),
          y: 0.15 + Math.random() * 0.7,
          vx: (Math.random() - 0.5) * 0.001,
          vy: (Math.random() - 0.5) * 0.0006,
          targetX: 0.08 + Math.random() * 0.84,
          targetY: 0.18 + Math.random() * 0.65,
          speed: isTitan ? (0.00025 + Math.random() * 0.0003) : (0.00045 + Math.random() * 0.0006),
          size: baseFishSize,
          angle: Math.random() * Math.PI * 2,
          wigglePhase: Math.random() * 10,
          depth: isTitan ? 0.6 + Math.random() * 0.35 : Math.random(),
          color: species.color,
          glow: variant === 'Golden' ? '#fbbf24' : variant === 'Glowing' ? '#38bdf8' : variant === 'Rainbow' ? '#f43f5e' : 'none',
        });
      }
    }
    fishListRef.current = updated;
  }, [availableFish, aquariumFish, isAquariumMode, location.id]);

  // Handle active events for Chest / Relic / Floating Bottle in pond
  useEffect(() => {
    const hasChest = activeEvents.some(e => e.event.bonusType === 'treasure_chest');
    chestPosRef.current.active = hasChest;

    const hasRelic = activeEvents.some(e => e.event.bonusType === 'sunken_relic');
    relicPosRef.current.active = hasRelic;

    bottlePosRef.current.active = hasFloatingBottle;
  }, [activeEvents, hasFloatingBottle]);

  // Sync Bobber state with fishing lifecycle
  useEffect(() => {
    if (fishingState === 'casting') {
      const canvas = canvasRef.current;
      const w = canvas ? canvas.width : 800;
      const h = canvas ? canvas.height : 500;
      const boatW = Math.min(260, w * 0.32);
      const boatH = Math.min(125, h * 0.26);
      const boatX = w - boatW - 20;
      const boatY = h - boatH - 24;
      const startX = boatX + boatW * 0.38 - 60;
      const startY = boatY + 22 - 45;

      bobberRef.current.x = startX;
      bobberRef.current.y = startY;

      if (castTargetPosRef.current) {
        bobberRef.current.targetX = castTargetPosRef.current.x;
        bobberRef.current.targetY = castTargetPosRef.current.y;
      } else {
        if (selectedZone === 'lily_pads') {
          bobberRef.current.targetX = w * (0.2 + Math.random() * 0.16);
          bobberRef.current.targetY = h * (0.3 + Math.random() * 0.2);
        } else if (selectedZone === 'reeds') {
          bobberRef.current.targetX = w * (0.64 + Math.random() * 0.16);
          bobberRef.current.targetY = h * (0.28 + Math.random() * 0.2);
        } else if (selectedZone === 'rocks_reef') {
          bobberRef.current.targetX = w * (0.25 + Math.random() * 0.45);
          bobberRef.current.targetY = h * (0.76 + Math.random() * 0.14);
        } else {
          bobberRef.current.targetX = w * (0.35 + Math.random() * 0.25);
          bobberRef.current.targetY = h * (0.42 + Math.random() * 0.22);
        }
      }

      bobberRef.current.progress = 0;
      bobberRef.current.active = true;
      bobberRef.current.submerged = 0;
    } else if (fishingState === 'idle') {
      bobberRef.current.active = false;
    }
  }, [fishingState, selectedZone]);

  // Add water ripple helper
  const addRipple = useCallback((x: number, y: number, maxRadius = 50, color = 'rgba(255, 255, 255, 0.4)') => {
    ripplesRef.current.push({
      x,
      y,
      radius: 4,
      maxRadius,
      opacity: 0.8,
      speed: 1.2,
      color,
    });
  }, []);

  // Main Canvas Rendering Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isMounted = true;

    const render = (time: number) => {
      if (!isMounted) return;

      const rawDt = (time - lastTimeRef.current) / 1000;
      const dt = Math.min(rawDt, 0.05); // Clamp dt to prevent jumping
      lastTimeRef.current = time;
      globalTimeRef.current += dt;
      const t = globalTimeRef.current;

      const w = canvas.width;
      const h = canvas.height;
      const dockW = Math.min(230, w * 0.28);
      const dockH = Math.min(150, h * 0.32);
      const dockX = w - dockW;
      const dockY = h - dockH;

      // 1. Draw water background gradient
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, location.waterColors[0]);
      grad.addColorStop(0.5, location.waterColors[1]);
      grad.addColorStop(1, location.waterColors[2]);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Event background filter effect
      const bloodMoonActive = activeEvents.some(e => e.event.bonusType === 'blood_moon');
      const goldenRainActive = activeEvents.some(e => e.event.bonusType === 'golden_boost');
      const cosmicEclipseActive = activeEvents.some(e => e.event.bonusType === 'cosmic_eclipse');

      if (bloodMoonActive) {
        ctx.fillStyle = 'rgba(185, 28, 28, 0.15)';
        ctx.fillRect(0, 0, w, h);
      } else if (goldenRainActive) {
        ctx.fillStyle = 'rgba(251, 191, 36, 0.12)';
        ctx.fillRect(0, 0, w, h);
      } else if (cosmicEclipseActive) {
        ctx.fillStyle = 'rgba(126, 34, 206, 0.15)';
        ctx.fillRect(0, 0, w, h);
      }

      // Day & Night Cycle ambient tint
      if (timeOfDay === 'dawn') {
        const dawnGrad = ctx.createLinearGradient(0, 0, 0, h);
        dawnGrad.addColorStop(0, 'rgba(251, 146, 60, 0.22)');
        dawnGrad.addColorStop(0.4, 'rgba(244, 114, 182, 0.12)');
        dawnGrad.addColorStop(1, 'rgba(254, 240, 138, 0.05)');
        ctx.fillStyle = dawnGrad;
        ctx.fillRect(0, 0, w, h);

        // Soft morning mist layer
        ctx.fillStyle = 'rgba(255, 255, 255, 0.07)';
        ctx.fillRect(0, h * 0.18, w, h * 0.3);
      } else if (timeOfDay === 'dusk') {
        const duskGrad = ctx.createLinearGradient(0, 0, 0, h);
        duskGrad.addColorStop(0, 'rgba(192, 38, 211, 0.22)');
        duskGrad.addColorStop(0.5, 'rgba(234, 88, 12, 0.18)');
        duskGrad.addColorStop(1, 'rgba(67, 56, 202, 0.1)');
        ctx.fillStyle = duskGrad;
        ctx.fillRect(0, 0, w, h);
      } else if (timeOfDay === 'night') {
        // Deep indigo night darkness
        ctx.fillStyle = 'rgba(3, 7, 26, 0.48)';
        ctx.fillRect(0, 0, w, h);

        // Glowing Crescent Moon in top left
        ctx.save();
        ctx.translate(65, 48);
        ctx.shadowColor = '#facc15';
        ctx.shadowBlur = 18;

        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(0, 0, 15, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(5, -3, 13, 0, Math.PI * 2);
        ctx.fill();

        // Shimmering moon water reflection
        ctx.fillStyle = 'rgba(254, 240, 138, 0.16)';
        ctx.beginPath();
        ctx.ellipse(0, h * 0.32 + Math.sin(t * 1.5) * 4, 20, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Twinkling stars reflected in upper water
        for (let s = 0; s < 10; s++) {
          const starX = ((s * 79 + 43) % w);
          const starY = ((s * 37 + 23) % (h * 0.45));
          const starAlpha = 0.3 + Math.sin(t * 3 + s) * 0.3;
          ctx.fillStyle = `rgba(255, 255, 255, ${starAlpha})`;
          ctx.fillRect(starX, starY, 2, 2);
        }

        // Luminous Fireflies floating over pond
        ctx.save();
        const fireflyCount = 12;
        for (let f = 0; f < fireflyCount; f++) {
          const ffX = (w * (0.08 + (f / fireflyCount) * 0.84)) + Math.sin(t * 0.8 + f * 1.4) * 20;
          const ffY = (h * (0.2 + (f % 5) * 0.11)) + Math.cos(t * 0.9 + f) * 14;
          const ffGlow = 0.35 + Math.sin(t * 3.2 + f * 2) * 0.45;

          ctx.shadowColor = '#a3e635';
          ctx.shadowBlur = 10;
          ctx.fillStyle = `rgba(250, 204, 21, ${ffGlow})`;
          ctx.beginPath();
          ctx.arc(ffX, ffY, 2.2, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = `rgba(163, 230, 53, ${ffGlow * 0.75})`;
          ctx.beginPath();
          ctx.arc(ffX, ffY, 4.5, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      // Weather: Falling Rain
      if (weather === 'rain') {
        ctx.save();
        ctx.strokeStyle = 'rgba(186, 230, 253, 0.45)';
        ctx.lineWidth = 1.2;
        const rainDrops = 40;
        for (let r = 0; r < rainDrops; r++) {
          const rx = ((r * 31 + t * 420) % (w + 60)) - 30;
          const ry = (r * 19 + t * 680) % (h + 30);
          ctx.beginPath();
          ctx.moveTo(rx, ry);
          ctx.lineTo(rx - 3, ry + 15);
          ctx.stroke();
        }

        // Surface rain ripples
        if (Math.random() < 0.22) {
          addRipple(Math.random() * w, Math.random() * (h * 0.75), 22, 'rgba(224, 242, 254, 0.4)');
        }
        ctx.restore();
      }

      // Season: Winter Frost & Ice Sheets
      if (season === 'winter') {
        ctx.save();
        ctx.fillStyle = 'rgba(224, 242, 254, 0.28)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
        ctx.lineWidth = 1.8;

        // Frozen ice shelf along top left
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(w * 0.36, 0);
        ctx.quadraticCurveTo(w * 0.3, h * 0.32, w * 0.16, h * 0.52);
        ctx.lineTo(0, h * 0.56);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Ice fishing hole in the ice
        ctx.fillStyle = location.waterColors[1];
        ctx.beginPath();
        ctx.ellipse(w * 0.16, h * 0.30, 24, 15, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.2;
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px sans-serif';
        ctx.fillText('❄️ Ice Hole', w * 0.16 - 18, h * 0.30 - 18);
        ctx.restore();
      }

      // 2. Draw Volumetric Sunbeams / God Rays piercing down from water surface
      ctx.save();
      const rayCount = (location.id === 'midnight_deep' || timeOfDay === 'night') ? 1 : 5;
      const rayColor =
        timeOfDay === 'dawn' ? 'rgba(251, 146, 60, 0.08)' :
        timeOfDay === 'dusk' ? 'rgba(244, 114, 182, 0.07)' :
        location.id === 'tropical_reef' ? 'rgba(254, 240, 138, 0.08)' :
        location.id === 'crystal_lake' ? 'rgba(224, 242, 254, 0.09)' :
        location.id === 'alien_waters' ? 'rgba(232, 121, 249, 0.07)' :
        location.id === 'midnight_deep' ? 'rgba(34, 211, 238, 0.04)' :
        'rgba(254, 243, 199, 0.08)';

      for (let r = 0; r < rayCount; r++) {
        const rayAngle = -0.25 + Math.sin(t * 0.35 + r) * 0.08;
        const rayX = (w * (0.12 + r * 0.2)) + Math.sin(t * 0.25 + r) * 25;
        const rayWidthTop = 20 + r * 8;
        const rayWidthBottom = 90 + r * 28;

        const rayGrad = ctx.createLinearGradient(rayX, 0, rayX + Math.sin(rayAngle) * h, h);
        rayGrad.addColorStop(0, rayColor);
        rayGrad.addColorStop(0.6, rayColor);
        rayGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

        ctx.fillStyle = rayGrad;
        ctx.beginPath();
        ctx.moveTo(rayX - rayWidthTop * 0.5, 0);
        ctx.lineTo(rayX + rayWidthTop * 0.5, 0);
        ctx.lineTo(rayX + Math.sin(rayAngle) * h + rayWidthBottom * 0.5, h);
        ctx.lineTo(rayX + Math.sin(rayAngle) * h - rayWidthBottom * 0.5, h);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();

      // 3. Draw animated layered water caustics / light waves
      ctx.save();
      ctx.globalAlpha = location.id === 'midnight_deep' ? 0.08 : 0.18;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.5;

      for (let layer = 0; layer < 4; layer++) {
        ctx.beginPath();
        const yBase = (h * (0.2 + layer * 0.22));
        const waveSpeed = 0.8 + layer * 0.4;
        const waveAmp = 8 + layer * 3;
        const waveFreq = 0.015 - layer * 0.002;

        for (let x = 0; x <= w; x += 15) {
          const y = yBase + Math.sin(x * waveFreq + t * waveSpeed) * waveAmp + Math.cos(x * 0.008 - t * 0.5) * 6;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      ctx.restore();

      // 4. Draw Seabed Shelf & Underwater Coral Reefs / Flora
      ctx.save();
      const seabedGrad = ctx.createLinearGradient(0, h * 0.76, 0, h);
      const sandColor =
        location.id === 'tropical_reef' ? 'rgba(254, 243, 199, 0.24)' :
        location.id === 'midnight_deep' ? 'rgba(15, 23, 42, 0.5)' :
        location.id === 'alien_waters' ? 'rgba(88, 28, 135, 0.32)' :
        location.id === 'crystal_lake' ? 'rgba(15, 118, 110, 0.26)' :
        'rgba(74, 55, 40, 0.24)';
      seabedGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
      seabedGrad.addColorStop(1, sandColor);
      ctx.fillStyle = seabedGrad;
      ctx.fillRect(0, h * 0.74, w, h * 0.26);

      const decors = seabedDecorRef.current;
      decors.forEach(d => {
        const dx = d.x * w;
        const dy = d.y * h;
        const sway = Math.sin(t * (d.swaySpeed || 1) + (d.swayPhase || 0)) * 5;

        ctx.save();
        ctx.translate(dx, dy);

        if (d.type === 'coral_branch') {
          // Branching Staghorn Coral
          ctx.strokeStyle = d.color;
          ctx.lineWidth = Math.max(3, d.size * 0.12);
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';

          // Main trunk
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.quadraticCurveTo(sway * 0.4, -d.size * 0.4, sway, -d.size * 0.72);
          ctx.stroke();

          // Left branch
          ctx.beginPath();
          ctx.moveTo(sway * 0.3, -d.size * 0.35);
          ctx.quadraticCurveTo(-d.size * 0.22 + sway, -d.size * 0.55, -d.size * 0.28 + sway, -d.size * 0.88);
          ctx.stroke();

          // Right branch
          ctx.beginPath();
          ctx.moveTo(sway * 0.38, -d.size * 0.45);
          ctx.quadraticCurveTo(d.size * 0.22 + sway, -d.size * 0.62, d.size * 0.3 + sway, -d.size * 0.95);
          ctx.stroke();

          // Coral rounded polyps/tips
          ctx.fillStyle = d.accentColor || '#ffffff';
          [
            { x: sway, y: -d.size * 0.72 },
            { x: -d.size * 0.28 + sway, y: -d.size * 0.88 },
            { x: d.size * 0.3 + sway, y: -d.size * 0.95 },
          ].forEach(pt => {
            ctx.beginPath();
            ctx.arc(pt.x, pt.y, Math.max(2.5, d.size * 0.08), 0, Math.PI * 2);
            ctx.fill();
          });
        } else if (d.type === 'coral_brain') {
          // Brain coral dome with ridges
          ctx.fillStyle = d.color;
          ctx.beginPath();
          ctx.ellipse(0, 0, d.size * 0.6, d.size * 0.42, 0, Math.PI, 0);
          ctx.fill();

          ctx.strokeStyle = d.accentColor || 'rgba(255, 255, 255, 0.45)';
          ctx.lineWidth = 1.6;
          for (let r = 1; r <= 3; r++) {
            ctx.beginPath();
            ctx.ellipse(0, 0, d.size * 0.6 * (r / 3.4), d.size * 0.42 * (r / 3.4), 0, Math.PI, 0);
            ctx.stroke();
          }
        } else if (d.type === 'coral_fan') {
          // Sea fan coral gently swaying with tide
          ctx.save();
          ctx.rotate((sway * Math.PI) / 220);
          ctx.strokeStyle = d.color;
          ctx.fillStyle = d.color + '45';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(0, 0, d.size * 0.75, -Math.PI * 0.85, -Math.PI * 0.15);
          ctx.lineTo(0, 0);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Mesh fan veins
          for (let f = -3; f <= 3; f++) {
            const a = -Math.PI * 0.5 + f * 0.18;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(a) * d.size * 0.75, Math.sin(a) * d.size * 0.75);
            ctx.stroke();
          }
          ctx.restore();
        } else if (d.type === 'anemone') {
          // Swaying sea anemone tentacles
          const tentacleCount = 7;
          for (let k = 0; k < tentacleCount; k++) {
            const tAngle = -Math.PI * 0.85 + (k / (tentacleCount - 1)) * Math.PI * 0.7;
            const tLen = d.size * (0.65 + Math.sin(k * 2) * 0.2);
            const tSway = sway + Math.sin(t * 2.2 + k) * 3;
            ctx.strokeStyle = d.color;
            ctx.lineWidth = 2.6;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.quadraticCurveTo(
              Math.cos(tAngle) * tLen * 0.5 + tSway * 0.5,
              Math.sin(tAngle) * tLen * 0.5,
              Math.cos(tAngle) * tLen + tSway,
              Math.sin(tAngle) * tLen
            );
            ctx.stroke();

            // Pastel tentacle bulb tip
            ctx.fillStyle = d.accentColor || '#ffffff';
            ctx.beginPath();
            ctx.arc(Math.cos(tAngle) * tLen + tSway, Math.sin(tAngle) * tLen, 2.2, 0, Math.PI * 2);
            ctx.fill();
          }
        } else if (d.type === 'starfish') {
          // 5-pointed starfish
          ctx.fillStyle = d.color;
          ctx.strokeStyle = d.accentColor || '#ffffff';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          for (let s = 0; s < 5; s++) {
            const outerA = (s * Math.PI * 2) / 5 - Math.PI / 2;
            const innerA = outerA + Math.PI / 5;
            const ox = Math.cos(outerA) * d.size * 0.5;
            const oy = Math.sin(outerA) * d.size * 0.5;
            const ix = Math.cos(innerA) * d.size * 0.22;
            const iy = Math.sin(innerA) * d.size * 0.22;
            if (s === 0) ctx.moveTo(ox, oy);
            else ctx.lineTo(ox, oy);
            ctx.lineTo(ix, iy);
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        } else if (d.type === 'weed') {
          // Freshwater eelgrass / lake reeds
          const strands = 3;
          for (let s = 0; s < strands; s++) {
            const sLen = d.size * (0.7 + s * 0.25);
            const sSway = sway * (1 + s * 0.4);
            ctx.strokeStyle = s === 0 ? d.color : d.accentColor || d.color;
            ctx.lineWidth = 3 - s * 0.6;
            ctx.beginPath();
            ctx.moveTo((s - 1) * 6, 0);
            ctx.bezierCurveTo(
              (s - 1) * 6 + sSway * 0.4, -sLen * 0.35,
              (s - 1) * 6 - sSway * 0.3, -sLen * 0.7,
              (s - 1) * 6 + sSway, -sLen
            );
            ctx.stroke();
          }
        } else if (d.type === 'crystal') {
          // Submerged quartz / alien crystals
          ctx.fillStyle = d.color;
          ctx.strokeStyle = d.accentColor || '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(0, -d.size * 0.9);
          ctx.lineTo(d.size * 0.22, -d.size * 0.3);
          ctx.lineTo(d.size * 0.18, 0);
          ctx.lineTo(-d.size * 0.18, 0);
          ctx.lineTo(-d.size * 0.22, -d.size * 0.3);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Facet reflection
          ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
          ctx.beginPath();
          ctx.moveTo(0, -d.size * 0.9);
          ctx.lineTo(0, 0);
          ctx.lineTo(d.size * 0.18, 0);
          ctx.lineTo(d.size * 0.22, -d.size * 0.3);
          ctx.closePath();
          ctx.fill();
        } else if (d.type === 'deep_vent') {
          // Hydrothermal black smoker chimney
          ctx.fillStyle = d.color;
          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(-d.size * 0.25, 0);
          ctx.lineTo(-d.size * 0.18, -d.size * 0.85);
          ctx.lineTo(d.size * 0.18, -d.size * 0.85);
          ctx.lineTo(d.size * 0.25, 0);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();

          // Glowing vent mouth
          ctx.fillStyle = d.accentColor || '#f97316';
          ctx.beginPath();
          ctx.ellipse(0, -d.size * 0.85, d.size * 0.18, 5, 0, 0, Math.PI * 2);
          ctx.fill();

          if (Math.random() < 0.25) {
            particlesRef.current.push({
              x: dx + (Math.random() - 0.5) * 8,
              y: dy - d.size * 0.85,
              vx: (Math.random() - 0.5) * 0.4,
              vy: -1.2 - Math.random() * 1.0,
              size: 1.8 + Math.random() * 2,
              opacity: 0.7,
              color: Math.random() > 0.5 ? '#f97316' : '#38bdf8',
              life: 0,
              maxLife: 3 + Math.random() * 2,
            });
          }
        } else if (d.type === 'rock') {
          // River / ocean pebble
          ctx.fillStyle = d.color;
          ctx.beginPath();
          ctx.ellipse(0, 0, d.size * 0.55, d.size * 0.3, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
          ctx.beginPath();
          ctx.ellipse(0, -d.size * 0.1, d.size * 0.38, d.size * 0.15, 0, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      });
      ctx.restore();

      // 5. Draw Deep Titan Shadow (Sharks, Whales, Narwhals, Megalodons in deep layer)
      const titan = titanShadowRef.current;
      if (titan && titan.active) {
        const tdx = titan.targetX * w - titan.x * w;
        const tdy = titan.targetY * h - titan.y * h;
        const tdist = Math.hypot(tdx, tdy);

        if (tdist < 30 || titan.x > 1.35 || titan.x < -0.35) {
          if (titan.x > 1.3) {
            titan.x = -0.3;
            titan.targetX = 1.3;
          } else if (titan.x < -0.3) {
            titan.x = 1.3;
            titan.targetX = -0.3;
          }
          titan.y = 0.52 + Math.random() * 0.22;
          titan.targetY = 0.52 + Math.random() * 0.22;
        }

        const desiredAngle = Math.atan2(tdy, tdx);
        let aDiff = desiredAngle - titan.angle;
        while (aDiff < -Math.PI) aDiff += Math.PI * 2;
        while (aDiff > Math.PI) aDiff -= Math.PI * 2;
        titan.angle += aDiff * 0.02;

        titan.x += (Math.cos(titan.angle) * titan.speed * w * 60 * dt) / w;
        titan.y += (Math.sin(titan.angle) * titan.speed * h * 60 * dt) / h;

        const tx = titan.x * w;
        const ty = titan.y * h;
        const tSize = titan.size;
        const tailWave = Math.sin(t * 2.2) * (tSize * 0.08);

        ctx.save();
        ctx.translate(tx, ty);
        ctx.rotate(titan.angle);
        ctx.globalAlpha = titan.opacity;
        ctx.fillStyle = '#020617';

        if (titan.type === 'shark' || titan.type === 'megalodon') {
          // Streamlined Shark / Apex Megalodon silhouette
          ctx.beginPath();
          ctx.moveTo(tSize * 0.5, 0);
          ctx.quadraticCurveTo(tSize * 0.2, -tSize * 0.2, -tSize * 0.3, -tSize * 0.12);
          ctx.lineTo(-tSize * 0.5, tailWave);
          ctx.lineTo(-tSize * 0.65, -tSize * 0.28 + tailWave);
          ctx.lineTo(-tSize * 0.58, tailWave);
          ctx.lineTo(-tSize * 0.65, tSize * 0.22 + tailWave);
          ctx.lineTo(-tSize * 0.5, tailWave);
          ctx.quadraticCurveTo(-tSize * 0.25, tSize * 0.16, tSize * 0.2, tSize * 0.16);
          ctx.closePath();
          ctx.fill();

          // Pectoral fins
          ctx.beginPath();
          ctx.moveTo(tSize * 0.1, -tSize * 0.05);
          ctx.lineTo(-tSize * 0.05, -tSize * 0.35);
          ctx.lineTo(-tSize * 0.12, -tSize * 0.15);
          ctx.closePath();
          ctx.fill();

          ctx.beginPath();
          ctx.moveTo(tSize * 0.1, tSize * 0.05);
          ctx.lineTo(-tSize * 0.05, tSize * 0.35);
          ctx.lineTo(-tSize * 0.12, tSize * 0.15);
          ctx.closePath();
          ctx.fill();
        } else if (titan.type === 'narwhal') {
          // Narwhal body with spiral horn
          ctx.beginPath();
          ctx.ellipse(0, 0, tSize * 0.42, tSize * 0.18, 0, 0, Math.PI * 2);
          ctx.fill();

          // Narwhal ivory tusk
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(tSize * 0.42, 0);
          ctx.lineTo(tSize * 0.78, -3);
          ctx.stroke();

          // Fluke tail
          ctx.beginPath();
          ctx.moveTo(-tSize * 0.4, 0);
          ctx.lineTo(-tSize * 0.58, -tSize * 0.22 + tailWave);
          ctx.lineTo(-tSize * 0.52, tailWave);
          ctx.lineTo(-tSize * 0.58, tSize * 0.22 + tailWave);
          ctx.closePath();
          ctx.fill();
        } else {
          // Giant Whale
          ctx.beginPath();
          ctx.moveTo(tSize * 0.52, 0);
          ctx.quadraticCurveTo(tSize * 0.2, -tSize * 0.24, -tSize * 0.35, -tSize * 0.12);
          ctx.lineTo(-tSize * 0.52, tailWave);
          ctx.lineTo(-tSize * 0.68, -tSize * 0.32 + tailWave);
          ctx.lineTo(-tSize * 0.6, tailWave);
          ctx.lineTo(-tSize * 0.68, tSize * 0.32 + tailWave);
          ctx.lineTo(-tSize * 0.52, tailWave);
          ctx.quadraticCurveTo(-tSize * 0.2, tSize * 0.28, tSize * 0.25, tSize * 0.2);
          ctx.closePath();
          ctx.fill();

          // Flippers
          ctx.beginPath();
          ctx.moveTo(tSize * 0.1, 0);
          ctx.quadraticCurveTo(-tSize * 0.05, -tSize * 0.42, -tSize * 0.18, -tSize * 0.35);
          ctx.lineTo(-tSize * 0.05, -tSize * 0.12);
          ctx.closePath();
          ctx.fill();
        }

        ctx.restore();
      }

      // 6. Draw Synchronized Schools of Baitfish
      const schools = schoolsRef.current;
      schools.forEach(school => {
        const ldx = school.targetX * w - school.leaderX * w;
        const ldy = school.targetY * h - school.leaderY * h;
        const ldist = Math.hypot(ldx, ldy);

        if (ldist < 40 || Math.random() < 0.01) {
          school.targetX = 0.1 + Math.random() * 0.8;
          school.targetY = 0.2 + Math.random() * 0.55;
        }

        const leaderAngle = Math.atan2(ldy, ldx);
        school.leaderX += (Math.cos(leaderAngle) * school.speed * w * 60 * dt) / w;
        school.leaderY += (Math.sin(leaderAngle) * school.speed * h * 60 * dt) / h;

        school.boids.forEach((boid, bIdx) => {
          boid.wigglePhase += dt * 12;
          const offsetX = Math.cos(bIdx * 0.8) * 0.035;
          const offsetY = Math.sin(bIdx * 0.8) * 0.03;
          const targetBoidX = school.leaderX + offsetX;
          const targetBoidY = school.leaderY + offsetY;

          boid.x += (targetBoidX - boid.x) * 0.08;
          boid.y += (targetBoidY - boid.y) * 0.08;
          boid.angle = leaderAngle + Math.sin(t * 3 + bIdx) * 0.1;

          ctx.save();
          ctx.translate(boid.x * w, boid.y * h);
          ctx.rotate(boid.angle);
          ctx.globalAlpha = 0.85;

          if (school.glow) {
            ctx.shadowColor = school.glow;
            ctx.shadowBlur = 8;
          }

          const boidSize = 11;
          const bWiggle = Math.sin(boid.wigglePhase) * 2;

          // Tiny baitfish body
          ctx.fillStyle = school.color;
          ctx.beginPath();
          ctx.ellipse(0, 0, boidSize * 0.6, boidSize * 0.25, 0, 0, Math.PI * 2);
          ctx.fill();

          // Tail
          ctx.fillStyle = school.accentColor;
          ctx.beginPath();
          ctx.moveTo(-boidSize * 0.5, 0);
          ctx.lineTo(-boidSize * 0.85, -boidSize * 0.3 + bWiggle);
          ctx.lineTo(-boidSize * 0.85, boidSize * 0.3 + bWiggle);
          ctx.closePath();
          ctx.fill();

          ctx.restore();
        });
      });

      // 7. Environmental particles (petals, stardust, bubbles, golden rain)
      if (Math.random() < 0.28) {
        let pColor = 'rgba(255, 255, 255, 0.5)';
        let pSize = 2 + Math.random() * 3;
        let vy = -0.5 - Math.random() * 0.8;
        let vx = (Math.random() - 0.5) * 0.4;

        if (goldenRainActive) {
          pColor = '#fbbf24';
          vy = 4 + Math.random() * 3;
          vx = -0.8;
        } else if (location.particleType === 'petals') {
          pColor = Math.random() > 0.5 ? '#fda4af' : '#fbcfe8';
          vy = 0.5 + Math.random() * 0.5;
          vx = 0.4 + Math.random() * 0.3;
        } else if (location.particleType === 'stardust' || cosmicEclipseActive) {
          pColor = Math.random() > 0.5 ? '#c084fc' : '#38bdf8';
          pSize = 1.5 + Math.random() * 3;
          vy = (Math.random() - 0.5) * 0.8;
        } else if (location.particleType === 'abyssal_spores') {
          pColor = '#06b6d4';
          vy = -0.6 - Math.random() * 0.8;
        }

        particlesRef.current.push({
          x: Math.random() * w,
          y: goldenRainActive ? -10 : location.particleType === 'petals' ? -10 : h + 10,
          vx,
          vy,
          size: pSize,
          opacity: 0.8,
          color: pColor,
          life: 0,
          maxLife: 4 + Math.random() * 3,
        });
      }

      // Update and draw particles
      ctx.save();
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.life += dt;
        p.x += p.vx * 60 * dt;
        p.y += p.vy * 60 * dt;
        p.opacity = Math.max(0, 1 - p.life / p.maxLife);

        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();

        if (p.life >= p.maxLife || p.x < -20 || p.x > w + 20 || p.y < -20 || p.y > h + 20) {
          particlesRef.current.splice(i, 1);
        }
      }
      ctx.restore();

      // 8. Update & Draw Swimming Fish (Rich fins, eyes, belly shading, and variant particles)
      const fishList = fishListRef.current;
      for (let i = 0; i < fishList.length; i++) {
        const f = fishList[i];
        f.wigglePhase += dt * 8;

        // Move towards target
        const dx = f.targetX * w - f.x;
        const dy = f.targetY * h - f.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 40 || Math.random() < 0.005) {
          f.targetX = 0.08 + Math.random() * 0.84;
          f.targetY = 0.15 + Math.random() * 0.7;
        }

        const targetAngle = Math.atan2(dy, dx);
        let angleDiff = targetAngle - f.angle;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        f.angle += angleDiff * 0.04;

        f.x += Math.cos(f.angle) * f.speed * w * 60 * dt;
        f.y += Math.sin(f.angle) * f.speed * h * 60 * dt;

        // Water ripples from fish movement occasionally
        if (Math.random() < 0.012 && f.depth < 0.4) {
          addRipple(f.x, f.y, 25, 'rgba(255, 255, 255, 0.2)');
        }

        // Draw fish
        ctx.save();
        ctx.translate(f.x, f.y);
        ctx.rotate(f.angle);

        // Fish shadow / depth opacity
        const depthAlpha = 0.6 + (1 - f.depth) * 0.4;
        ctx.globalAlpha = depthAlpha;

        if (f.glow !== 'none') {
          ctx.shadowColor = f.glow;
          ctx.shadowBlur = 14;
        }

        const wiggle = Math.sin(f.wigglePhase) * (f.size * 0.12);
        const fishLen = f.size;
        const fishWidth = f.size * 0.42;

        // Dorsal fin (top)
        ctx.fillStyle = f.species.finColor || f.color;
        ctx.beginPath();
        ctx.moveTo(-fishLen * 0.1, -fishWidth * 0.45);
        ctx.quadraticCurveTo(-fishLen * 0.05, -fishWidth * 0.9, -fishLen * 0.35, -fishWidth * 0.45);
        ctx.closePath();
        ctx.fill();

        // Pectoral fin (lower flank)
        ctx.beginPath();
        ctx.moveTo(fishLen * 0.05, fishWidth * 0.2);
        ctx.lineTo(-fishLen * 0.15, fishWidth * 0.55 + wiggle * 0.5);
        ctx.lineTo(-fishLen * 0.05, fishWidth * 0.18);
        ctx.closePath();
        ctx.fill();

        // Fish body
        ctx.fillStyle = f.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, fishLen * 0.5, fishWidth * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Belly lighter shading
        ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
        ctx.beginPath();
        ctx.ellipse(0, fishWidth * 0.14, fishLen * 0.42, fishWidth * 0.24, 0, 0, Math.PI);
        ctx.fill();

        // Species accent stripe/spots if present
        if (f.species.accentColor) {
          ctx.strokeStyle = f.species.accentColor;
          ctx.lineWidth = Math.max(1.5, f.size * 0.06);
          ctx.beginPath();
          ctx.moveTo(-fishLen * 0.2, 0);
          ctx.lineTo(fishLen * 0.25, 0);
          ctx.stroke();
        }

        // Tail fin
        ctx.fillStyle = f.species.finColor || f.color;
        ctx.beginPath();
        ctx.moveTo(-fishLen * 0.45, 0);
        ctx.lineTo(-fishLen * 0.88, -fishWidth * 0.5 + wiggle);
        ctx.lineTo(-fishLen * 0.72, 0);
        ctx.lineTo(-fishLen * 0.88, fishWidth * 0.5 + wiggle);
        ctx.closePath();
        ctx.fill();

        // Eye with shiny white reflection
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(fishLen * 0.28, -fishWidth * 0.15, Math.max(2.2, f.size * 0.09), 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(fishLen * 0.3, -fishWidth * 0.15, Math.max(1.2, f.size * 0.05), 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(fishLen * 0.32, -fishWidth * 0.18, Math.max(0.7, f.size * 0.025), 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }

      // 5. Draw Lily Pads and Flora
      if (location.id === 'little_pond' || location.id === 'crystal_lake') {
        ctx.save();
        lilyPadsRef.current.forEach((pad, idx) => {
          const px = pad.x * w;
          const py = pad.y * h + Math.sin(t * 0.8 + idx) * 3;

          // Shadow
          ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
          ctx.beginPath();
          ctx.arc(px, py + 4, pad.radius, 0, Math.PI * 2);
          ctx.fill();

          // Pad body (with slice notch)
          ctx.fillStyle = location.id === 'crystal_lake' ? '#0d9488' : '#15803d';
          ctx.beginPath();
          ctx.arc(px, py, pad.radius, pad.angle + 0.3, pad.angle + Math.PI * 2 - 0.3);
          ctx.lineTo(px, py);
          ctx.closePath();
          ctx.fill();

          // Inner vein ring
          ctx.strokeStyle = location.id === 'crystal_lake' ? '#14b8a6' : '#22c55e';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.arc(px, py, pad.radius * 0.6, pad.angle + 0.4, pad.angle + Math.PI * 2 - 0.4);
          ctx.stroke();

          // Lotus flower
          if (pad.hasFlower) {
            ctx.fillStyle = pad.flowerColor;
            for (let f = 0; f < 5; f++) {
              const fAngle = (f * Math.PI * 2) / 5 + pad.angle;
              const petalX = px + Math.cos(fAngle) * 7;
              const petalY = py + Math.sin(fAngle) * 7;
              ctx.beginPath();
              ctx.arc(petalX, petalY, 4.5, 0, Math.PI * 2);
              ctx.fill();
            }
            // Gold center
            ctx.fillStyle = '#f59e0b';
            ctx.beginPath();
            ctx.arc(px, py, 3.5, 0, Math.PI * 2);
            ctx.fill();
          }
        });
        ctx.restore();
      }

      // Draw Little Visitor (Frog, Turtle, Duck, Otter, Crab, Raccoon)
      if (activeVisitor) {
        const vType = activeVisitor.type;
        let vx = 0;
        let vy = 0;

        if (vType === 'frog') {
          vx = w * 0.22;
          vy = h * 0.38 + Math.sin(t * 1.5) * 2;
        } else if (vType === 'turtle') {
          vx = w * 0.42 + Math.sin(t * 0.5) * 5;
          vy = h * 0.62 + Math.cos(t * 0.5) * 2.5;
        } else if (vType === 'duck') {
          vx = w * (0.35 + Math.sin(t * 0.35) * 0.08);
          vy = h * 0.28 + Math.sin(t * 2) * 2;
        } else if (vType === 'otter') {
          vx = w * (0.62 + Math.cos(t * 0.5) * 0.06);
          vy = h * 0.46 + Math.sin(t * 2.5) * 3.5;
        } else if (vType === 'crab') {
          vx = dockX + 38;
          vy = dockY - 10 + Math.sin(t * 3) * 1.8;
        } else if (vType === 'raccoon') {
          vx = dockX + 55;
          vy = dockY - 42;
        }

        visitorPosRef.current = { x: vx / w, y: vy / h };

        ctx.save();
        ctx.translate(vx, vy);

        if (vType === 'frog') {
          // Lily pad base under frog
          ctx.fillStyle = '#15803d';
          ctx.beginPath();
          ctx.ellipse(0, 10, 26, 12, 0, 0, Math.PI * 2);
          ctx.fill();

          // Frog body
          ctx.fillStyle = '#16a34a';
          ctx.beginPath();
          ctx.ellipse(0, 0, 16, 13, 0, 0, Math.PI * 2);
          ctx.fill();

          // Throat puff
          const throatPuff = Math.sin(t * 3.5) * 3.5;
          ctx.fillStyle = '#bbf7d0';
          ctx.beginPath();
          ctx.ellipse(0, 4, 10 + throatPuff, 7 + throatPuff * 0.5, 0, 0, Math.PI * 2);
          ctx.fill();

          // Eyes with slow blinking
          const blink = Math.sin(t * 1.2) > 0.94 ? 0.2 : 1;
          [-8, 8].forEach(eyeX => {
            ctx.fillStyle = '#16a34a';
            ctx.beginPath();
            ctx.arc(eyeX, -10, 6.5, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#fef08a';
            ctx.beginPath();
            ctx.arc(eyeX, -10, 4.5, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#0f172a';
            ctx.beginPath();
            ctx.ellipse(eyeX, -10, 2, 3.5 * blink, 0, 0, Math.PI * 2);
            ctx.fill();
          });

          // Frog smile
          ctx.strokeStyle = '#14532d';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(0, 0, 6, 0.2, Math.PI - 0.2);
          ctx.stroke();

        } else if (vType === 'turtle') {
          // Sunken driftwood log
          ctx.fillStyle = '#78350f';
          ctx.beginPath();
          ctx.roundRect(-30, -5, 60, 16, 6);
          ctx.fill();

          // Turtle shell
          ctx.fillStyle = '#14532d';
          ctx.beginPath();
          ctx.ellipse(0, -6, 20, 14, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#86efac';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          // Turtle head
          const headNod = Math.sin(t * 1.5) * 3;
          ctx.fillStyle = '#22c55e';
          ctx.beginPath();
          ctx.ellipse(22 + headNod, -8, 8, 6, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#000000';
          ctx.beginPath();
          ctx.arc(24 + headNod, -9, 1.5, 0, Math.PI * 2);
          ctx.fill();

          // Webbed paddling feet
          [[-14, 6], [12, 6], [-14, -14], [12, -14]].forEach(([fx, fy]) => {
            ctx.fillStyle = '#16a34a';
            ctx.beginPath();
            ctx.arc(fx, fy, 4, 0, Math.PI * 2);
            ctx.fill();
          });

        } else if (vType === 'duck') {
          // Wake ripples
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(-18, 0);
          ctx.lineTo(-38, -12);
          ctx.moveTo(-18, 0);
          ctx.lineTo(-38, 12);
          ctx.stroke();

          // Mallard body
          ctx.fillStyle = '#78350f';
          ctx.beginPath();
          ctx.ellipse(0, 0, 18, 11, 0, 0, Math.PI * 2);
          ctx.fill();

          // Emerald head
          ctx.fillStyle = '#047857';
          ctx.beginPath();
          ctx.arc(14, -8, 8, 0, Math.PI * 2);
          ctx.fill();

          // White neck ring
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(12, -4, 4, 0, Math.PI);
          ctx.stroke();

          // Yellow bill
          ctx.fillStyle = '#f59e0b';
          ctx.beginPath();
          ctx.moveTo(20, -9);
          ctx.lineTo(29, -7);
          ctx.lineTo(20, -5);
          ctx.closePath();
          ctx.fill();

          ctx.fillStyle = '#000000';
          ctx.beginPath();
          ctx.arc(16, -10, 1.6, 0, Math.PI * 2);
          ctx.fill();

        } else if (vType === 'otter') {
          const roll = Math.sin(t * 3);
          // Otter body
          ctx.fillStyle = '#573318';
          ctx.beginPath();
          ctx.ellipse(0, 0, 22, 10, roll * 0.2, 0, Math.PI * 2);
          ctx.fill();

          // Belly
          ctx.fillStyle = '#fed7aa';
          ctx.beginPath();
          ctx.ellipse(0, 2, 14, 5, 0, 0, Math.PI * 2);
          ctx.fill();

          // Head
          ctx.fillStyle = '#653a1a';
          ctx.beginPath();
          ctx.arc(18, -4, 9, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#000000';
          ctx.beginPath();
          ctx.arc(24, -4, 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(19, -7, 1.5, 0, Math.PI * 2);
          ctx.fill();

          // Whiskers
          ctx.strokeStyle = '#e2e8f0';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(22, -3);
          ctx.lineTo(28, -5);
          ctx.moveTo(22, -2);
          ctx.lineTo(28, -1);
          ctx.stroke();

          // Paws
          ctx.fillStyle = '#45230e';
          ctx.beginPath();
          ctx.arc(8, -6, 3.5, 0, Math.PI * 2);
          ctx.fill();

        } else if (vType === 'crab') {
          const clawWave = Math.sin(t * 4) * 6;
          // Crab shell
          ctx.fillStyle = '#dc2626';
          ctx.beginPath();
          ctx.ellipse(0, 0, 12, 9, 0, 0, Math.PI * 2);
          ctx.fill();

          // Raised claws
          [-1, 1].forEach(side => {
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(side * 8, -2);
            ctx.lineTo(side * 14, -8 + clawWave * side);
            ctx.stroke();

            ctx.fillStyle = '#b91c1c';
            ctx.beginPath();
            ctx.arc(side * 15, -10 + clawWave * side, 4, 0, Math.PI * 2);
            ctx.fill();
          });

          // Stalk eyes
          [-4, 4].forEach(eyeX => {
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(eyeX, -8, 2.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            ctx.arc(eyeX, -8, 1.2, 0, Math.PI * 2);
            ctx.fill();
          });

        } else if (vType === 'raccoon') {
          // Bandit Raccoon peeking from dock
          ctx.fillStyle = '#475569';
          ctx.beginPath();
          ctx.ellipse(0, 0, 16, 12, 0, 0, Math.PI * 2);
          ctx.fill();

          // Bandit mask
          ctx.fillStyle = '#0f172a';
          ctx.beginPath();
          ctx.ellipse(0, -2, 14, 5, 0, 0, Math.PI * 2);
          ctx.fill();

          [-6, 6].forEach(ex => {
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(ex, -2, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            ctx.arc(ex, -2, 1.5, 0, Math.PI * 2);
            ctx.fill();
          });

          // Nose
          ctx.fillStyle = '#e2e8f0';
          ctx.beginPath();
          ctx.ellipse(0, 4, 6, 4, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#000000';
          ctx.beginPath();
          ctx.arc(0, 3, 2, 0, Math.PI * 2);
          ctx.fill();

          // Ears
          [-11, 11].forEach(earX => {
            ctx.fillStyle = '#334155';
            ctx.beginPath();
            ctx.arc(earX, -12, 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#f1f5f9';
            ctx.beginPath();
            ctx.arc(earX, -12, 2.5, 0, Math.PI * 2);
            ctx.fill();
          });

          // Paws
          [-8, 8].forEach(pawX => {
            ctx.fillStyle = '#1e293b';
            ctx.beginPath();
            ctx.arc(pawX, 10, 3.5, 0, Math.PI * 2);
            ctx.fill();
          });
        }

        // Floating name badge & heart over visitor
        const heartFloat = Math.sin(t * 3) * 3;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(-38, -34 + heartFloat, 76, 18, 9);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`❤️ ${visitorName || VISITORS_CONFIG[vType].defaultName}`, 0, -22 + heartFloat);

        ctx.restore();
      }

      // 6. Draw Interactive Event Objects (Treasure Chest & Sunken Relic)
      if (chestPosRef.current.active) {
        chestPosRef.current.bobOffset = Math.sin(t * 2) * 5;
        const cx = chestPosRef.current.x * w;
        const cy = chestPosRef.current.y * h + chestPosRef.current.bobOffset;

        ctx.save();
        ctx.translate(cx, cy);

        // Water ring under chest
        ctx.strokeStyle = 'rgba(251, 191, 36, 0.4)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(0, 16, 26, 8, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Chest base
        ctx.fillStyle = '#78350f';
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.roundRect(-22, -14, 44, 28, 4);
        ctx.fill();
        ctx.stroke();

        // Gold bands & keyhole
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(-6, -14, 12, 28);
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(0, 0, 3, 0, Math.PI * 2);
        ctx.fill();

        // Sparkle indicators
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px sans-serif';
        ctx.fillText('✨ Click!', -22, -20);
        ctx.restore();
      }

      if (relicPosRef.current.active) {
        relicPosRef.current.bobOffset = Math.cos(t * 1.8) * 6;
        const rx = relicPosRef.current.x * w;
        const ry = relicPosRef.current.y * h + relicPosRef.current.bobOffset;

        ctx.save();
        ctx.translate(rx, ry);

        // Mystic glow
        ctx.shadowColor = '#d97706';
        ctx.shadowBlur = 18;

        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(0, 0, 16, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#451a03';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('☀️', 0, 4);

        ctx.fillStyle = '#fef08a';
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText('RELIC', 0, -20);
        ctx.restore();
      }

      // Draw Floating Message in a Bottle (Grandfather's Lost Journal Pages)
      if (bottlePosRef.current.active) {
        bottlePosRef.current.bobOffset = Math.sin(t * 2.2) * 5;
        const bx = bottlePosRef.current.x * w;
        const by = bottlePosRef.current.y * h + bottlePosRef.current.bobOffset;

        ctx.save();
        ctx.translate(bx, by);

        // Water ripple around bottle
        ctx.strokeStyle = 'rgba(251, 191, 36, 0.45)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(0, 10, 18, 6, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Bottle glass body
        ctx.fillStyle = 'rgba(186, 230, 253, 0.65)';
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.roundRect(-10, -12, 20, 24, 6);
        ctx.fill();
        ctx.stroke();

        // Bottle neck & cork stopper
        ctx.fillStyle = 'rgba(186, 230, 253, 0.85)';
        ctx.fillRect(-4, -18, 8, 6);
        ctx.fillStyle = '#b45309'; // cork
        ctx.fillRect(-3, -22, 6, 4);

        // Rolled ancient parchment inside with red wax seal
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(-5, -6, 10, 14);
        ctx.fillStyle = '#dc2626'; // wax seal
        ctx.beginPath();
        ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Animated sparkle indicator
        const sparkPop = Math.sin(t * 3.5) * 2;
        ctx.fillStyle = '#fef08a';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('📜 New Page!', 0, -26 + sparkPop);

        ctx.restore();
      }

      // 7. Update & Draw Water Ripples
      ctx.save();
      for (let i = ripplesRef.current.length - 1; i >= 0; i--) {
        const r = ripplesRef.current[i];
        r.radius += r.speed * 60 * dt;
        r.opacity = Math.max(0, 1 - r.radius / r.maxRadius);

        ctx.strokeStyle = r.color || 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 2;
        ctx.globalAlpha = r.opacity;
        ctx.beginPath();
        ctx.ellipse(r.x, r.y, r.radius, r.radius * 0.45, 0, 0, Math.PI * 2);
        ctx.stroke();

        if (r.radius >= r.maxRadius) {
          ripplesRef.current.splice(i, 1);
        }
      }
      ctx.restore();

      // 8. Draw Upgradable Boat Vessel & Customizable Fisherman Character
      const boatW = Math.min(270, w * 0.34);
      const boatH = Math.min(130, h * 0.28);
      const boatBaseX = w - boatW - 20;
      const boatBaseY = h - boatH - 24;

      const boatBob = Math.sin(t * 1.8) * 3.5;
      const boatRock = Math.sin(t * 1.4) * 0.035;

      const boatX = boatBaseX;
      const boatY = boatBaseY + boatBob;

      // Draw displacement water wake and foam around the floating boat hull
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(boatX + boatW * 0.46, boatY + boatH * 0.76, boatW * 0.52, 10, boatRock, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.ellipse(boatX + boatW * 0.46, boatY + boatH * 0.78, boatW * 0.60, 15, boatRock, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // --- BOAT VESSEL GRAPHICS (TIERS 1 - 5) ---
      ctx.save();
      ctx.translate(boatX + boatW * 0.5, boatY + boatH * 0.5);
      ctx.rotate(boatRock);

      const bHalfW = boatW * 0.5;
      const bHalfH = boatH * 0.5;

      if (boatTier === 1) {
        // TIER 1: RUSTIC WOODEN ROWBOAT (Grandfather Arthur's Old Cedar Dinghy)
        // Outer dark wood hull
        ctx.fillStyle = '#451a03';
        ctx.beginPath();
        ctx.moveTo(-bHalfW * 0.88, bHalfH * 0.3);
        ctx.quadraticCurveTo(-bHalfW * 0.4, bHalfH * 0.78, bHalfW * 0.76, bHalfH * 0.45);
        ctx.lineTo(bHalfW * 0.86, -bHalfH * 0.08);
        ctx.quadraticCurveTo(bHalfW * 0.2, -bHalfH * 0.35, -bHalfW * 0.88, -bHalfH * 0.04);
        ctx.closePath();
        ctx.fill();

        // Main cedar planking
        ctx.fillStyle = '#78350f';
        ctx.beginPath();
        ctx.moveTo(-bHalfW * 0.84, bHalfH * 0.25);
        ctx.quadraticCurveTo(-bHalfW * 0.38, bHalfH * 0.7, bHalfW * 0.72, bHalfH * 0.4);
        ctx.lineTo(bHalfW * 0.82, -bHalfH * 0.06);
        ctx.quadraticCurveTo(bHalfW * 0.2, -bHalfH * 0.3, -bHalfW * 0.84, -bHalfH * 0.02);
        ctx.closePath();
        ctx.fill();

        // Inner deck & bench planks
        ctx.fillStyle = '#92400e';
        ctx.beginPath();
        ctx.moveTo(-bHalfW * 0.72, bHalfH * 0.16);
        ctx.quadraticCurveTo(-bHalfW * 0.3, bHalfH * 0.52, bHalfW * 0.64, bHalfH * 0.26);
        ctx.lineTo(bHalfW * 0.7, -bHalfH * 0.02);
        ctx.quadraticCurveTo(bHalfW * 0.2, -bHalfH * 0.18, -bHalfW * 0.72, 0);
        ctx.closePath();
        ctx.fill();

        // Wooden cross-seat benches
        ctx.fillStyle = '#b45309';
        ctx.fillRect(-bHalfW * 0.52, -bHalfH * 0.06, 16, bHalfH * 0.4);
        ctx.fillRect(-bHalfW * 0.1, -bHalfH * 0.1, 18, bHalfH * 0.46);
        ctx.fillRect(bHalfW * 0.32, -bHalfH * 0.08, 16, bHalfH * 0.38);

        // Wooden Oars resting on gunwales
        ctx.strokeStyle = '#d97706';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-bHalfW * 0.15, -bHalfH * 0.05);
        ctx.lineTo(-bHalfW * 0.55, -bHalfH * 0.65);
        ctx.moveTo(-bHalfW * 0.05, bHalfH * 0.25);
        ctx.lineTo(-bHalfW * 0.45, bHalfH * 0.85);
        ctx.stroke();

        // Oar blades
        ctx.fillStyle = '#b45309';
        ctx.beginPath();
        ctx.ellipse(-bHalfW * 0.52, -bHalfH * 0.62, 10, 4, -0.7, 0, Math.PI * 2);
        ctx.ellipse(-bHalfW * 0.42, bHalfH * 0.82, 10, 4, 0.7, 0, Math.PI * 2);
        ctx.fill();

        // Bow vintage copper lantern swinging
        const lanternSwing = Math.sin(t * 2.2) * 0.15;
        ctx.save();
        ctx.translate(-bHalfW * 0.82, -bHalfH * 0.1);
        ctx.rotate(lanternSwing);
        ctx.strokeStyle = '#78350f';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, 0); ctx.lineTo(0, 8);
        ctx.stroke();
        // Glowing lantern body
        ctx.fillStyle = 'rgba(251, 191, 36, 0.3)';
        ctx.beginPath();
        ctx.arc(0, 16, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#b45309';
        ctx.fillRect(-4, 8, 8, 12);
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(-2.5, 10, 5, 8);
        ctx.restore();

      } else if (boatTier === 2) {
        // TIER 2: ANGLER'S MOTOR SKIFF
        // Azure hydro-hull
        ctx.fillStyle = '#0284c7';
        ctx.beginPath();
        ctx.moveTo(-bHalfW * 0.9, bHalfH * 0.28);
        ctx.quadraticCurveTo(-bHalfW * 0.4, bHalfH * 0.72, bHalfW * 0.78, bHalfH * 0.4);
        ctx.lineTo(bHalfW * 0.88, -bHalfH * 0.12);
        ctx.quadraticCurveTo(bHalfW * 0.2, -bHalfH * 0.38, -bHalfW * 0.9, -bHalfH * 0.06);
        ctx.closePath();
        ctx.fill();

        // White marine interior lining
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.moveTo(-bHalfW * 0.78, bHalfH * 0.18);
        ctx.quadraticCurveTo(-bHalfW * 0.35, bHalfH * 0.55, bHalfW * 0.68, bHalfH * 0.28);
        ctx.lineTo(bHalfW * 0.76, -bHalfH * 0.05);
        ctx.quadraticCurveTo(bHalfW * 0.2, -bHalfH * 0.22, -bHalfW * 0.78, 0);
        ctx.closePath();
        ctx.fill();

        // Cyan accent side stripe
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(-bHalfW * 0.85, bHalfH * 0.2);
        ctx.quadraticCurveTo(-bHalfW * 0.35, bHalfH * 0.6, bHalfW * 0.74, bHalfH * 0.35);
        ctx.stroke();

        // Outboard Motor at stern
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(bHalfW * 0.76, -bHalfH * 0.05, 18, 22);
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(bHalfW * 0.84, 8, 8, 16);
        // Propeller bubbles
        const propBubble = Math.sin(t * 30) * 2;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.beginPath();
        ctx.arc(bHalfW * 0.9 + propBubble, 24, 2.5, 0, Math.PI * 2);
        ctx.arc(bHalfW * 0.96, 27, 3.5, 0, Math.PI * 2);
        ctx.fill();

        // Sun bimini canopy top
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-bHalfW * 0.1, -bHalfH * 0.15); ctx.lineTo(-bHalfW * 0.1, -bHalfH * 0.75);
        ctx.moveTo(bHalfW * 0.4, -bHalfH * 0.12); ctx.lineTo(bHalfW * 0.4, -bHalfH * 0.75);
        ctx.stroke();

        // Canvas shade top
        ctx.fillStyle = '#0369a1';
        ctx.beginPath();
        ctx.roundRect(-bHalfW * 0.2, -bHalfH * 0.85, bHalfW * 0.75, 12, 3);
        ctx.fill();

      } else if (boatTier === 3) {
        // TIER 3: OCEANIC CABIN CRUISER
        // Dark midnight navy hull with gold pinstripe
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.moveTo(-bHalfW * 0.94, bHalfH * 0.25);
        ctx.quadraticCurveTo(-bHalfW * 0.35, bHalfH * 0.75, bHalfW * 0.82, bHalfH * 0.42);
        ctx.lineTo(bHalfW * 0.92, -bHalfH * 0.15);
        ctx.quadraticCurveTo(bHalfW * 0.2, -bHalfH * 0.42, -bHalfW * 0.94, -bHalfH * 0.08);
        ctx.closePath();
        ctx.fill();

        // Gold waterline stripe
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-bHalfW * 0.88, bHalfH * 0.22);
        ctx.quadraticCurveTo(-bHalfW * 0.35, bHalfH * 0.65, bHalfW * 0.8, bHalfH * 0.38);
        ctx.stroke();

        // Raised enclosed wheelhouse cabin
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.roundRect(0, -bHalfH * 0.82, bHalfW * 0.72, bHalfH * 0.7, 4);
        ctx.fill();
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Glowing warm cabin windows
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.roundRect(bHalfW * 0.08, -bHalfH * 0.72, 18, 14, 2);
        ctx.roundRect(bHalfW * 0.32, -bHalfH * 0.72, 22, 14, 2);
        ctx.fill();

        // Rotating radar scanner arch on cabin roof
        const radarSpin = Math.sin(t * 3.5);
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(bHalfW * 0.4, -bHalfH * 0.82);
        ctx.lineTo(bHalfW * 0.4, -bHalfH * 0.98);
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(bHalfW * 0.4, -bHalfH * 0.98, 12 * Math.abs(radarSpin) + 4, 3, 0, 0, Math.PI * 2);
        ctx.fill();

        // Stainless steel bow pulpit railing
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(-bHalfW * 0.85, -bHalfH * 0.05);
        ctx.lineTo(-bHalfW * 0.85, -bHalfH * 0.3);
        ctx.lineTo(-bHalfW * 0.2, -bHalfH * 0.25);
        ctx.stroke();

      } else if (boatTier === 4) {
        // TIER 4: SLEEK SPORTS CATAMARAN
        // Bioluminescent glowing cyan underwater LED underglow
        ctx.shadowColor = '#06b6d4';
        ctx.shadowBlur = 18;
        ctx.fillStyle = '#06b6d4';
        ctx.beginPath();
        ctx.ellipse(0, bHalfH * 0.6, bHalfW * 0.85, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Matte stealth graphite twin-hull body
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.moveTo(-bHalfW * 0.98, bHalfH * 0.2);
        ctx.lineTo(-bHalfW * 0.4, bHalfH * 0.65);
        ctx.lineTo(bHalfW * 0.85, bHalfH * 0.4);
        ctx.lineTo(bHalfW * 0.95, -bHalfH * 0.18);
        ctx.lineTo(bHalfW * 0.1, -bHalfH * 0.45);
        ctx.lineTo(-bHalfW * 0.98, -bHalfH * 0.08);
        ctx.closePath();
        ctx.fill();

        // Aerodynamic carbon fiber spoiler / arch
        ctx.fillStyle = '#0284c7';
        ctx.beginPath();
        ctx.moveTo(bHalfW * 0.4, -bHalfH * 0.1);
        ctx.lineTo(bHalfW * 0.55, -bHalfH * 0.78);
        ctx.lineTo(bHalfW * 0.85, -bHalfH * 0.74);
        ctx.lineTo(bHalfW * 0.75, -bHalfH * 0.1);
        ctx.closePath();
        ctx.fill();

        // High-tech holographic sonar dome
        const sonarPulse = (t * 2) % 1;
        ctx.strokeStyle = `rgba(6, 182, 212, ${1 - sonarPulse})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(bHalfW * 0.65, -bHalfH * 0.76, 6 + sonarPulse * 16, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#06b6d4';
        ctx.beginPath();
        ctx.arc(bHalfW * 0.65, -bHalfH * 0.76, 5, 0, Math.PI * 2);
        ctx.fill();

      } else {
        // TIER 5: THE SOVEREIGN GRAND MEGA YACHT
        // Radiant starlight glow
        ctx.shadowColor = '#fbbf24';
        ctx.shadowBlur = 14;

        // Multi-tier pristine pearl-white hull
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.moveTo(-bHalfW * 0.98, bHalfH * 0.22);
        ctx.quadraticCurveTo(-bHalfW * 0.35, bHalfH * 0.72, bHalfW * 0.86, bHalfH * 0.42);
        ctx.lineTo(bHalfW * 0.96, -bHalfH * 0.22);
        ctx.quadraticCurveTo(bHalfW * 0.2, -bHalfH * 0.55, -bHalfW * 0.98, -bHalfH * 0.1);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;

        // Rich teak wood floorboards
        ctx.fillStyle = '#d97706';
        ctx.beginPath();
        ctx.moveTo(-bHalfW * 0.78, bHalfH * 0.15);
        ctx.quadraticCurveTo(-bHalfW * 0.3, bHalfH * 0.5, bHalfW * 0.76, bHalfH * 0.28);
        ctx.lineTo(bHalfW * 0.82, -bHalfH * 0.08);
        ctx.quadraticCurveTo(bHalfW * 0.2, -bHalfH * 0.3, -bHalfW * 0.78, 0);
        ctx.closePath();
        ctx.fill();

        // Polished golden royal railing & stanchions
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(-bHalfW * 0.92, -bHalfH * 0.05);
        ctx.lineTo(-bHalfW * 0.92, -bHalfH * 0.35);
        ctx.lineTo(bHalfW * 0.4, -bHalfH * 0.32);
        ctx.stroke();

        // Multi-tier upper sky bridge with tinted panoramic glass
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.roundRect(bHalfW * 0.1, -bHalfH * 0.92, bHalfW * 0.68, bHalfH * 0.65, 5);
        ctx.fill();

        // Tinted panoramic bridge glass
        ctx.fillStyle = '#0284c7';
        ctx.beginPath();
        ctx.roundRect(bHalfW * 0.15, -bHalfH * 0.85, bHalfW * 0.58, 16, 3);
        ctx.fill();

        // Helipad circle with gold 'H' marking on aft deck!
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(-bHalfW * 0.4, bHalfH * 0.22, 14, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#fbbf24';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('H', -bHalfW * 0.4, bHalfH * 0.26);

        // Gold champagne ice bucket & sparkling glasses
        ctx.fillStyle = '#eab308';
        ctx.beginPath();
        ctx.arc(bHalfW * 0.05, bHalfH * 0.12, 5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Name plaque on the boat's stern or transom
      const custom = customRef.current;
      const fishermanName = custom.name || 'Old Pete';
      ctx.fillStyle = boatTier === 5 ? '#eab308' : '#fef08a';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`⚓ ${fishermanName}`, 0, bHalfH * 0.18);

      ctx.restore();

      // --- BUBBLES THE MAGICAL POND SPIRIT COMPANION ---
      const bubblesX = boatX - 32 + Math.cos(t * 1.8) * 8;
      const bubblesY = boatY - 18 + Math.sin(t * 2.6) * 7;
      bubblesPosRef.current = { x: bubblesX, y: bubblesY };

      ctx.save();
      ctx.translate(bubblesX, bubblesY);

      // Luminous spirit aura halo
      const bubbleAura = Math.sin(t * 4) * 3;
      ctx.fillStyle = 'rgba(56, 189, 248, 0.25)';
      ctx.beginPath();
      ctx.arc(0, 0, 18 + bubbleAura, 0, Math.PI * 2);
      ctx.fill();

      // Main spirit bubble body
      ctx.fillStyle = 'rgba(56, 189, 248, 0.75)';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Translucent fluttering spirit fins
      const wingFlap = Math.sin(t * 12) * 4;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.beginPath();
      ctx.ellipse(-11, wingFlap, 5, 3, -0.4, 0, Math.PI * 2);
      ctx.ellipse(11, -wingFlap, 5, 3, 0.4, 0, Math.PI * 2);
      ctx.fill();

      // Cute anime blinking eyes
      const isBubblesBlinking = (t % 3.6 < 0.15);
      if (isBubblesBlinking) {
        ctx.strokeStyle = '#0369a1';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-5, -1); ctx.lineTo(-2, -1);
        ctx.moveTo(2, -1); ctx.lineTo(5, -1);
        ctx.stroke();
      } else {
        ctx.fillStyle = '#0369a1';
        ctx.beginPath();
        ctx.arc(-3.5, -1, 1.8, 0, Math.PI * 2);
        ctx.arc(3.5, -1, 1.8, 0, Math.PI * 2);
        ctx.fill();

        // Eye glint
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(-4, -1.8, 0.8, 0, Math.PI * 2);
        ctx.arc(3, -1.8, 0.8, 0, Math.PI * 2);
        ctx.fill();
      }

      // Blushing cheeks
      ctx.fillStyle = 'rgba(244, 114, 182, 0.6)';
      ctx.beginPath();
      ctx.arc(-5, 2.5, 2, 0, Math.PI * 2);
      ctx.arc(5, 2.5, 2, 0, Math.PI * 2);
      ctx.fill();

      // Sweet smile
      ctx.strokeStyle = '#0369a1';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(0, 2, 2.2, 0.2, Math.PI - 0.2);
      ctx.stroke();

      // Thought / speech callout above Bubbles
      const emoteBob = Math.sin(t * 3.5) * 2;
      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.roundRect(-24, -30 + emoteBob, 48, 16, 8);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      const bText = bubblesMessage || '✨ Bubbles';
      ctx.fillText(bText, 0, -19 + emoteBob);

      ctx.restore();

      // --- CUSTOMIZABLE FISHERMAN CHARACTER (POSITIONED ON BOAT) ---
      const curSkin = SKIN_TONES.find(s => s.id === custom.skinId) || SKIN_TONES[0];
      const curHair = HAIR_STYLES.find(h => h.id === custom.hairId) || HAIR_STYLES[0];
      const curBeard = FACIAL_HAIR_STYLES.find(b => b.id === custom.facialHairId) || FACIAL_HAIR_STYLES[0];
      const curHat = HATS.find(h => h.id === custom.hatId) || HATS[0];
      const curOutfit = OUTFITS.find(o => o.id === custom.outfitId) || OUTFITS[0];

      // Fisherman seated position on the boat deck
      const manX = boatX + boatW * 0.38;
      let manY = boatY + 20;

      // Gentle breathing idle offset
      const breath = Math.sin(t * 2.5) * 1.4;
      manY += breath;

      // Fisherman posture tilt based on state and boat rocking
      let tilt = boatRock;
      if (fishingState === 'nibble') tilt = -0.07 + boatRock;
      else if (fishingState === 'hooked') tilt = 0.16 + boatRock; // pulling back hard!
      else if (fishingState === 'reeling') tilt = Math.sin(t * 14) * 0.06 + boatRock;

      ctx.save();
      ctx.translate(manX, manY);
      ctx.rotate(tilt);

      // Animated kicking / dangling boot in water
      const footKick = Math.sin(t * 2.0) * 4;

      // Legs / Pants dangling over edge
      ctx.fillStyle = curOutfit.color;
      ctx.fillRect(-12, 4, 24, 12); // thighs
      // Shin dangling with gentle sway
      ctx.fillRect(-14 + footKick * 0.2, 14, 10, 16);
      // Boots
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(-17 + footKick * 0.4, 26, 14, 8);

      // Torso / Jacket
      ctx.fillStyle = curOutfit.color;
      ctx.beginPath();
      ctx.roundRect(-10, -22, 22, 26, 4);
      ctx.fill();

      // Shirt / Overalls center bib / accent
      ctx.fillStyle = curOutfit.accentColor || '#dc2626';
      ctx.fillRect(-6, -18, 12, 18);

      // Halloween Skeleton Outfit Bone Ribs
      if (curOutfit.id === 'outfit_skeleton') {
        ctx.strokeStyle = '#86efac';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-5, -14); ctx.lineTo(3, -14);
        ctx.moveTo(-6, -10); ctx.lineTo(4, -10);
        ctx.moveTo(-5, -6); ctx.lineTo(3, -6);
        ctx.stroke();
      }

      // Halloween Frankenstein Neck Bolts
      if (curOutfit.id === 'outfit_frankenstein' || custom.hairId === 'hair_franken') {
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(-5, -26, 2, 4);
        ctx.fillRect(3, -26, 2, 4);
      }

      // Neck & Head
      ctx.fillStyle = curSkin.color;
      ctx.fillRect(-3, -28, 6, 8);
      ctx.beginPath();
      ctx.arc(0, -34, 11, 0, Math.PI * 2);
      ctx.fill();

      // Hair
      ctx.fillStyle = curHair.color;
      ctx.beginPath();
      ctx.arc(0, -36, 11.5, Math.PI, Math.PI * 2);
      ctx.fill();
      if (custom.hairId === 'hair_ponytail') {
        ctx.beginPath();
        ctx.ellipse(9, -32, 4, 8, 0.4, 0, Math.PI * 2);
        ctx.fill();
      }

      // Facial hair / beard
      if (curBeard.id !== 'beard_clean') {
        ctx.fillStyle = curBeard.color;
        ctx.beginPath();
        ctx.arc(0, -32, 9, 0.2, Math.PI - 0.2);
        ctx.fill();
      }

      // Animated Blinking Eyes (blinks naturally every 4 seconds)
      const isBlinking = (t % 4.2 < 0.16);
      if (isBlinking) {
        // Closed eye slit
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-6, -34);
        ctx.lineTo(-2, -34);
        ctx.stroke();
      } else {
        // Open bright eye with pupil
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(-4, -34, 1.6, 0, Math.PI * 2);
        ctx.fill();
      }

      // Smile / mouth expression
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1;
      ctx.beginPath();
      if (fishingState === 'hooked') {
        // O-shape excited mouth
        ctx.arc(-4, -29, 2.2, 0, Math.PI * 2);
      } else {
        // Relaxed friendly smile
        ctx.arc(-4, -30, 2.5, 0.2, Math.PI - 0.2);
      }
      ctx.stroke();

      // Hat / Halloween Masks
      if (curHat.id === 'hat_straw') {
        ctx.fillStyle = '#fde047';
        ctx.beginPath();
        ctx.ellipse(0, -42, 18, 4.5, -0.05, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#eab308';
        ctx.beginPath();
        ctx.roundRect(-8, -49, 16, 8, 2);
        ctx.fill();
      } else if (curHat.id === 'hat_pumpkin') {
        // Glowing Jack-o'-Lantern Mask with animated candle flame
        ctx.fillStyle = '#ea580c';
        ctx.beginPath();
        ctx.ellipse(0, -35, 14, 14, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#15803d'; // green stem
        ctx.fillRect(-2, -51, 4, 4);
        // Carved glowing eyes & jagged mouth
        ctx.fillStyle = Math.sin(t * 12) > 0 ? '#fef08a' : '#fde047';
        ctx.beginPath();
        ctx.moveTo(-7, -37); ctx.lineTo(-4, -37); ctx.lineTo(-5.5, -40); ctx.closePath();
        ctx.fill();
        // Jagged smile
        ctx.strokeStyle = '#fef08a';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(-7, -31); ctx.lineTo(-5, -29); ctx.lineTo(-3, -31); ctx.lineTo(-1, -29);
        ctx.stroke();
      } else if (curHat.id === 'hat_witch') {
        // Witch Hat
        ctx.fillStyle = '#2e1065';
        ctx.beginPath();
        ctx.ellipse(0, -42, 20, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(-10, -42); ctx.lineTo(10, -42); ctx.lineTo(2, -62); ctx.lineTo(6, -66); ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#a855f7';
        ctx.fillRect(-9, -44, 18, 3);
      } else if (curHat.id === 'hat_skeleton') {
        // Skull mask with glowing green eyes
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.arc(0, -34, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#020617';
        ctx.beginPath();
        ctx.arc(-4, -34, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#4ade80';
        ctx.beginPath();
        ctx.arc(-4, -34, 1.2, 0, Math.PI * 2);
        ctx.fill();
      } else if (curHat.id === 'hat_vampire') {
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.ellipse(-2, -41, 16, 4, -0.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#dc2626';
        ctx.beginPath();
        ctx.arc(-2, -45, 3, 0, Math.PI * 2);
        ctx.fill();
      } else if (curHat.id === 'hat_ghost') {
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.arc(0, -36, 14, Math.PI, Math.PI * 2);
        ctx.lineTo(14, -26); ctx.lineTo(-14, -26); ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#020617';
        ctx.beginPath();
        ctx.arc(-4, -34, 2.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (curHat.id === 'hat_bucket') {
        ctx.fillStyle = '#15803d';
        ctx.beginPath();
        ctx.ellipse(0, -41, 16, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#16a34a';
        ctx.fillRect(-7, -48, 14, 8);
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(-2, -45, 3, 2);
      } else if (curHat.id === 'hat_beanie') {
        ctx.fillStyle = '#ea580c';
        ctx.beginPath();
        ctx.arc(0, -40, 10, Math.PI, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(-9, -41, 18, 4);
        ctx.fillStyle = '#fb923c';
        ctx.beginPath();
        ctx.arc(0, -50, 3, 0, Math.PI * 2);
        ctx.fill();
      } else if (curHat.id === 'hat_captain') {
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.ellipse(-2, -41, 16, 4, -0.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(-7, -47, 14, 7);
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(-7, -43, 14, 2);
      } else if (curHat.id === 'hat_crown') {
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.moveTo(-9, -41); ctx.lineTo(-6, -50); ctx.lineTo(-2, -44);
        ctx.lineTo(2, -52); ctx.lineTo(6, -44); ctx.lineTo(9, -41);
        ctx.closePath();
        ctx.fill();
      } else if (curHat.id === 'hat_diver') {
        ctx.fillStyle = '#b45309';
        ctx.beginPath();
        ctx.arc(0, -34, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(-4, -34, 7, 0, Math.PI * 2);
        ctx.fill();
      }

      // Arms holding Fishing Rod with animated reeling crank
      ctx.fillStyle = curOutfit.color;
      ctx.beginPath();
      // Arm reaching forward
      ctx.moveTo(4, -14);
      ctx.lineTo(-12, -4);
      ctx.lineTo(-10, 0);
      ctx.lineTo(6, -10);
      ctx.fill();
      // Hands
      ctx.fillStyle = curSkin.color;
      ctx.beginPath();
      ctx.arc(-14, -2, 3.5, 0, Math.PI * 2);
      ctx.fill();

      // Cranking hand when reeling!
      if (fishingState === 'reeling') {
        const crankAngle = t * 24;
        const crankX = -10 + Math.cos(crankAngle) * 4;
        const crankY = 0 + Math.sin(crankAngle) * 4;
        ctx.fillStyle = curSkin.color;
        ctx.beginPath();
        ctx.arc(crankX, crankY, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Fishing Rod Position & Dynamic Flex Curve
      let rodAngle = -0.55;
      let rodBend = 0;

      if (fishingState === 'nibble') {
        rodBend = Math.sin(t * 18) * 7;
      } else if (fishingState === 'hooked') {
        rodBend = 28 + Math.sin(t * 22) * 5;
      } else if (fishingState === 'reeling') {
        rodBend = 16 + Math.sin(t * 12) * 6;
      }

      // Rod base at hands
      const rodBaseX = -14;
      const rodBaseY = -2;
      const rodLength = 68;
      const rawTipX = rodBaseX + Math.cos(rodAngle) * rodLength;
      const rawTipY = rodBaseY + Math.sin(rodAngle) * rodLength + rodBend;

      // Draw Flexible Rod
      ctx.strokeStyle = '#78350f';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(rodBaseX + 8, rodBaseY + 4);
      ctx.quadraticCurveTo(
        (rodBaseX + rawTipX) / 2,
        (rodBaseY + rawTipY) / 2 + rodBend * 0.8,
        rawTipX,
        rawTipY
      );
      ctx.stroke();

      // Rod gold accents & tip eyelet
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 1.8;
      ctx.stroke();
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(rawTipX, rawTipY, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Reel on handle
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(rodBaseX + 2, rodBaseY + 2, 4.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      // Compute actual world coordinates of the rod tip
      const worldRodTipX = manX - 60;
      const worldRodTipY = manY - 45 + rodBend;

      // Draw Fishing Line and Bobber
      const bobber = bobberRef.current;
      if (bobber.active) {
        // Animate casting flight
        if (bobber.progress < 1) {
          bobber.progress = Math.min(1, bobber.progress + dt * 2.2);
          const p = bobber.progress;
          // Parabolic arc originating from fisherman's rod tip
          const startX = worldRodTipX;
          const startY = worldRodTipY;
          bobber.x = startX + (bobber.targetX - startX) * p;
          const arcHeight = 110 * Math.sin(p * Math.PI);
          bobber.y = startY + (bobber.targetY - startY) * p - arcHeight;

          if (bobber.progress >= 1) {
            addRipple(bobber.targetX, bobber.targetY, 65, 'rgba(255, 255, 255, 0.6)');
            sound.playSplash();
          }
        } else {
          // Bobber floating in water
          let bobDip = Math.sin(t * 3) * 2.5;

          if (fishingState === 'nibble') {
            bobDip = Math.sin(t * 14) * 6;
            if (Math.random() < 0.1) {
              addRipple(bobber.x, bobber.y + 4, 25, 'rgba(255, 255, 255, 0.5)');
            }
          } else if (fishingState === 'hooked') {
            bobDip = 14 + Math.sin(t * 18) * 4;
            if (Math.random() < 0.2) {
              addRipple(bobber.x, bobber.y + 4, 40, 'rgba(56, 189, 248, 0.8)');
            }
          }

          bobber.submerged = bobDip;
        }

        // Draw Fishing Line (Rod tip to Bobber)
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(worldRodTipX, worldRodTipY);
        // Slack curve
        const midX = (worldRodTipX + bobber.x) / 2;
        const midY = (worldRodTipY + bobber.y) / 2 + (bobber.progress < 1 ? -35 : 20);
        ctx.quadraticCurveTo(midX, midY, bobber.x, bobber.y);
        ctx.stroke();

        // Draw Bobber
        const bx = bobber.x;
        const by = bobber.y + bobber.submerged;

        // Bobber shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(bx, by + 4, 8, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        // Bobber bottom (white)
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(bx, by, 7, 0, Math.PI);
        ctx.fill();

        // Bobber top (bright red/orange)
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(bx, by, 7, Math.PI, Math.PI * 2);
        ctx.fill();

        // Bobber antenna
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(bx, by - 7);
        ctx.lineTo(bx, by - 14);
        ctx.stroke();

        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(bx, by - 14, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Exclamation / Cue badges
        if (fishingState === 'hooked') {
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.roundRect(bx - 26, by - 46, 52, 24, 6);
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.stroke();

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 12px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('BITE! 🎣', bx, by - 30);
        } else if (fishingState === 'nibble') {
          ctx.fillStyle = '#f59e0b';
          ctx.beginPath();
          ctx.roundRect(bx - 18, by - 36, 36, 18, 5);
          ctx.fill();
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 11px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('...!?', bx, by - 23);
        }

        ctx.restore();
      } else {
        // Idle line: short gentle line hanging into water from rod tip
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(worldRodTipX, worldRodTipY);
        const slackY = worldRodTipY + 45 + Math.sin(t * 2) * 3;
        ctx.lineTo(worldRodTipX, slackY);
        ctx.stroke();
        // Tiny hook
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(worldRodTipX, slackY, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      ctx.restore();

      animationFrameId.current = requestAnimationFrame(render);
    };

    animationFrameId.current = requestAnimationFrame(render);

    return () => {
      isMounted = false;
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [location, activeEvents, fishingState, addRipple]);

  // Handle Canvas Resize
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      canvas.width = Math.floor(rect.width);
      canvas.height = Math.floor(rect.height);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Calculate fishing zone from normalized canvas coordinates
  const getZoneAt = (xNorm: number, yNorm: number): PondZone => {
    if (yNorm >= 0.72) return 'rocks_reef';
    if (xNorm <= 0.42 && yNorm <= 0.58) return 'lily_pads';
    if (xNorm >= 0.60 && yNorm <= 0.54) return 'reeds';
    return 'deep_water';
  };

  // Handle Mouse Move for Zone Reticle
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || fishingState !== 'idle') {
      if (hoverInfo) setHoverInfo(null);
      return;
    }
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const zone = getZoneAt(clickX / canvas.width, clickY / canvas.height);
    setHoverInfo({ zone, x: clickX, y: clickY });
  };

  // Handle Click / Tap interaction on Canvas
  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Check click on Little Visitor
    if (activeVisitor && onInteractVisitor) {
      const vx = visitorPosRef.current.x * canvas.width;
      const vy = visitorPosRef.current.y * canvas.height;
      const distV = Math.hypot(clickX - vx, clickY - vy);
      if (distV < 45) {
        onInteractVisitor(activeVisitor.type);
        return;
      }
    }

    // Check click on Treasure Chest
    if (chestPosRef.current.active && onCollectChest) {
      const cx = chestPosRef.current.x * canvas.width;
      const cy = chestPosRef.current.y * canvas.height + chestPosRef.current.bobOffset;
      const dist = Math.hypot(clickX - cx, clickY - cy);
      if (dist < 40) {
        onCollectChest();
        return;
      }
    }

    // Check click on Relic
    if (relicPosRef.current.active && onCollectRelic) {
      const rx = relicPosRef.current.x * canvas.width;
      const ry = relicPosRef.current.y * canvas.height + relicPosRef.current.bobOffset;
      const dist = Math.hypot(clickX - rx, clickY - ry);
      if (dist < 40) {
        onCollectRelic();
        return;
      }
    }

    // Check click on Floating Message Bottle
    if (bottlePosRef.current.active && onCollectBottle) {
      const bx = bottlePosRef.current.x * canvas.width;
      const by = bottlePosRef.current.y * canvas.height + bottlePosRef.current.bobOffset;
      const distB = Math.hypot(clickX - bx, clickY - by);
      if (distB < 42) {
        onCollectBottle();
        return;
      }
    }

    // Check click on Bubbles companion
    if (onInteractBubbles) {
      const bbx = bubblesPosRef.current.x;
      const bby = bubblesPosRef.current.y;
      const distBubbles = Math.hypot(clickX - bbx, clickY - bby);
      if (distBubbles < 40) {
        onInteractBubbles();
        return;
      }
    }

    // If fish is hooked, clicking canvas reels it in!
    if (fishingState === 'hooked' || fishingState === 'nibble') {
      onReelIn();
      return;
    }

    // Otherwise, cast line towards this position with pinpoint accuracy
    if (fishingState === 'idle') {
      const zone = getZoneAt(clickX / canvas.width, clickY / canvas.height);
      castTargetPosRef.current = { x: clickX, y: clickY };
      onManualCast(clickX, clickY, zone);
    }
  };

  const ZONE_INFO: Record<PondZone, { icon: string; title: string; hint: string }> = {
    lily_pads: { icon: '🪷', title: 'Lily Pads & Surface', hint: 'Agile shallow fish, frogs & pearls' },
    deep_water: { icon: '🌊', title: 'Deep Abyss', hint: 'Apex titans, sharks, whales & megalodons' },
    rocks_reef: { icon: '🪨', title: 'Reef & Rocky Seabed', hint: 'Crustaceans, bottom fish & relics' },
    reeds: { icon: '🌿', title: 'Reeds & Shallows', hint: 'Pike, catfish & lost tackle' },
  };

  return (
    <div className="relative w-full h-full min-h-[380px] rounded-3xl overflow-hidden shadow-2xl border-2 border-emerald-900/40 select-none bg-slate-950">
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverInfo(null)}
        className="w-full h-full cursor-crosshair block"
      />

      {/* Floating Canvas UI Overlay */}
      <div className="absolute top-4 left-4 pointer-events-none flex items-center gap-2">
        <div className="px-3.5 py-1.5 rounded-full bg-slate-900/80 backdrop-blur-md border border-slate-700/60 text-white text-xs font-semibold flex items-center gap-2 shadow-lg">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
          <span>{isAquariumMode ? '🐠 Custom Aquarium' : `🌊 ${location.name}`}</span>
        </div>
      </div>

      {/* Dynamic Zone Targeting Indicator when hovering in Idle state */}
      {fishingState === 'idle' && hoverInfo && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-none transition-all">
          <div className="px-4 py-1.5 rounded-full bg-slate-900/90 backdrop-blur-md border border-emerald-500/50 text-white text-xs font-semibold flex items-center gap-2 shadow-xl animate-fade-in">
            <span className="text-base">{ZONE_INFO[hoverInfo.zone].icon}</span>
            <span>Target: <strong className="text-emerald-300">{ZONE_INFO[hoverInfo.zone].title}</strong></span>
            <span className="text-slate-400 text-[11px] font-normal hidden sm:inline">
              ({ZONE_INFO[hoverInfo.zone].hint})
            </span>
          </div>
        </div>
      )}

      {/* Default click-to-cast helper indicator when idle and not hovering */}
      {fishingState === 'idle' && !hoverInfo && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-none">
          <div className="px-4 py-1.5 rounded-full bg-slate-900/75 backdrop-blur-md border border-slate-700/60 text-slate-300 text-xs font-medium animate-bounce shadow-md">
            Click anywhere on the pond or press Space to Cast! 🎣
          </div>
        </div>
      )}
    </div>
  );
};

// Fallback species
const speciesPlaceholder: FishSpecies = {
  id: 'pond_minnow',
  name: 'Common Minnow',
  scientificName: 'Phoxinus vulgaris',
  rarity: 'Common',
  locationId: 'little_pond',
  basePrice: 5,
  minSize: 4.0,
  maxSize: 8.5,
  description: 'A cheerful minnow.',
  preferredDepth: 'surface',
  color: '#94a3b8',
  accentColor: '#cbd5e1',
  finColor: '#64748b',
  pattern: 'plain',
};
