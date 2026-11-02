import React from 'react';
import { FishSpecies, FishVariant } from '../types/game';
import { FISH_VARIANTS } from '../data/fishData';

interface FishRendererProps {
  species: FishSpecies;
  variant?: FishVariant;
  isSilhouette?: boolean;
  size?: number; // width in px
  animate?: boolean;
  className?: string;
}

export const FishRenderer: React.FC<FishRendererProps> = ({
  species,
  variant = 'Standard',
  isSilhouette = false,
  size = 120,
  animate = true,
  className = '',
}) => {
  const height = size * 0.55;
  const variantData = FISH_VARIANTS[variant] || FISH_VARIANTS.Standard;

  if (isSilhouette) {
    return (
      <div 
        className={`relative inline-flex items-center justify-center ${className}`}
        style={{ width: size, height }}
      >
        <svg 
          viewBox="0 0 160 90" 
          width={size} 
          height={height}
          className="opacity-35 brightness-0 invert drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
        >
          {/* Generic fish silhouette */}
          <ellipse cx="75" cy="45" rx="55" ry="24" fill="#000" />
          <polygon points="120,45 155,20 150,45 155,70" fill="#000" />
          <polygon points="65,22 80,10 95,22" fill="#000" />
          <polygon points="65,68 80,80 95,68" fill="#000" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center font-bold text-slate-400 text-lg select-none">
          ?
        </div>
      </div>
    );
  }

  // Variant color overrides & styling
  let mainColor = species.color;
  let accentColor = species.accentColor;
  let finColor = species.finColor;
  let filterId = '';

  if (variant === 'Golden') {
    mainColor = '#f59e0b';
    accentColor = '#fef08a';
    finColor = '#d97706';
  } else if (variant === 'Rainbow') {
    mainColor = '#ec4899';
    accentColor = '#38bdf8';
    finColor = '#a855f7';
  } else if (variant === 'Cosmic') {
    mainColor = '#6366f1';
    accentColor = '#f472b6';
    finColor = '#3b0764';
  } else if (variant === 'Corrupted') {
    mainColor = '#18181b';
    accentColor = '#f43f5e';
    finColor = '#881337';
  } else if (variant === 'Ancient') {
    mainColor = '#78350f';
    accentColor = '#fbbf24';
    finColor = '#451a03';
  } else if (variant === 'Glowing') {
    mainColor = '#06b6d4';
    accentColor = '#67e8f9';
    finColor = '#0891b2';
  }

  const uniqueId = `fish_${species.id}_${variant}_${Math.floor(size)}`;

  return (
    <div
      className={`relative inline-flex items-center justify-center ${className}`}
      style={{
        width: size,
        height,
        filter: variantData.glow !== 'none' ? `drop-shadow(${variantData.glow})` : undefined,
      }}
    >
      <svg
        viewBox="0 0 160 90"
        width={size}
        height={height}
        className={`overflow-visible ${animate ? 'transition-transform duration-300' : ''}`}
      >
        <defs>
          {/* Body gradient */}
          <linearGradient id={`grad_${uniqueId}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={accentColor} />
            <stop offset="60%" stopColor={mainColor} />
            <stop offset="100%" stopColor={finColor} />
          </linearGradient>

          {/* Rainbow variant gradient */}
          {variant === 'Rainbow' && (
            <linearGradient id={`rainbow_${uniqueId}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="20%" stopColor="#f59e0b" />
              <stop offset="40%" stopColor="#10b981" />
              <stop offset="60%" stopColor="#06b6d4" />
              <stop offset="80%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#ec4899" />
            </linearGradient>
          )}

          {/* Cosmic starry pattern */}
          {variant === 'Cosmic' && (
            <radialGradient id={`cosmic_${uniqueId}`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#c084fc" />
              <stop offset="50%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#1e1b4b" />
            </radialGradient>
          )}
        </defs>

        <g className={animate ? 'animate-pulse' : ''} style={{ animationDuration: '3s' }}>
          {/* Dorsal Fin (Top) */}
          <path
            d="M 55 24 Q 75 8 100 22 C 85 20 70 20 55 24 Z"
            fill={finColor}
            opacity="0.9"
          />

          {/* Ventral Fin (Bottom) */}
          <path
            d="M 65 66 Q 80 82 95 68 C 85 68 75 67 65 66 Z"
            fill={finColor}
            opacity="0.9"
          />

          {/* Tail Fin with gentle wiggle */}
          <g className={animate ? 'origin-[120px_45px]' : ''}>
            <path
              d="M 120 45 C 135 25 155 12 155 35 C 145 45 145 45 155 55 C 155 78 135 65 120 45 Z"
              fill={finColor}
              opacity="0.95"
            />
            {/* Tail spine details */}
            <line x1="122" y1="45" x2="150" y2="28" stroke={accentColor} strokeWidth="1.2" opacity="0.6" />
            <line x1="122" y1="45" x2="148" y2="45" stroke={accentColor} strokeWidth="1.2" opacity="0.6" />
            <line x1="122" y1="45" x2="150" y2="62" stroke={accentColor} strokeWidth="1.2" opacity="0.6" />
          </g>

          {/* Main Fish Body */}
          <path
            d="M 22 45 C 22 25 60 18 100 28 C 118 33 125 45 125 45 C 125 45 118 57 100 62 C 60 72 22 65 22 45 Z"
            fill={variant === 'Rainbow' ? `url(#rainbow_${uniqueId})` : variant === 'Cosmic' ? `url(#cosmic_${uniqueId})` : `url(#grad_${uniqueId})`}
            stroke={variant === 'Corrupted' ? '#f43f5e' : accentColor}
            strokeWidth={variant === 'Corrupted' ? '2' : '1'}
          />

          {/* Belly highlight */}
          <path
            d="M 35 48 C 45 60 85 64 110 50 C 95 56 60 56 35 48 Z"
            fill={accentColor}
            opacity="0.35"
          />

          {/* Species-specific Patterns */}
          {species.pattern === 'stripes' && (
            <g stroke={accentColor} strokeWidth="2.5" strokeLinecap="round" opacity="0.7">
              <path d="M 50 28 Q 52 45 50 62" />
              <path d="M 70 25 Q 72 45 70 65" />
              <path d="M 90 28 Q 92 45 90 62" />
            </g>
          )}

          {species.pattern === 'spots' && (
            <g fill={accentColor} opacity="0.75">
              <circle cx="55" cy="38" r="3" />
              <circle cx="68" cy="48" r="3.5" />
              <circle cx="82" cy="36" r="2.8" />
              <circle cx="92" cy="46" r="3.2" />
              <circle cx="60" cy="54" r="2.5" />
            </g>
          )}

          {species.pattern === 'scales' && (
            <g stroke={accentColor} strokeWidth="1.2" fill="none" opacity="0.5">
              <path d="M 50 36 A 6 6 0 0 1 60 36 A 6 6 0 0 1 70 36" />
              <path d="M 55 44 A 6 6 0 0 1 65 44 A 6 6 0 0 1 75 44" />
              <path d="M 60 52 A 6 6 0 0 1 70 52 A 6 6 0 0 1 80 52" />
            </g>
          )}

          {species.pattern === 'glow' && (
            <g fill={accentColor} opacity="0.9">
              <circle cx="55" cy="45" r="4" filter="blur(1px)" />
              <circle cx="75" cy="42" r="5" filter="blur(1.5px)" />
              <circle cx="95" cy="45" r="3.5" filter="blur(1px)" />
            </g>
          )}

          {species.pattern === 'whiskers' && (
            <g stroke={accentColor} strokeWidth="1.8" strokeLinecap="round" fill="none">
              <path d="M 26 47 Q 15 52 10 60" />
              <path d="M 28 49 Q 18 60 14 70" />
            </g>
          )}

          {/* Pectoral Fin (Side) */}
          <path
            d="M 48 46 Q 62 48 68 56 Q 56 56 48 46 Z"
            fill={finColor}
            opacity="0.85"
            stroke={accentColor}
            strokeWidth="0.8"
          />

          {/* Eye */}
          <g>
            <circle cx="36" cy="38" r="5" fill="#ffffff" />
            <circle 
              cx="35" 
              cy="38" 
              r="2.8" 
              fill={variant === 'Corrupted' ? '#ef4444' : variant === 'Golden' ? '#b45309' : '#0f172a'} 
            />
            <circle cx="34" cy="36" r="1.2" fill="#ffffff" />
          </g>

          {/* Special Variant Particle Embellishments */}
          {variant === 'Golden' && (
            <g fill="#fef08a" opacity="0.9">
              <polygon points="45,20 47,23 50,23 48,25 49,28 46,26 43,28 44,25 42,23 45,23" transform="scale(0.5) translate(40, 10)" />
              <polygon points="45,20 47,23 50,23 48,25 49,28 46,26 43,28 44,25 42,23 45,23" transform="scale(0.4) translate(180, 70)" />
            </g>
          )}

          {variant === 'Cosmic' && (
            <g fill="#ffffff" opacity="0.95">
              <circle cx="60" cy="35" r="1" />
              <circle cx="78" cy="48" r="1.2" />
              <circle cx="95" cy="38" r="0.8" />
              <circle cx="85" cy="55" r="1.1" />
            </g>
          )}

          {variant === 'Corrupted' && (
            <g stroke="#f43f5e" strokeWidth="1.5" strokeLinecap="round" opacity="0.8">
              <line x1="25" y1="32" x2="28" y2="28" />
              <line x1="85" y1="20" x2="88" y2="16" />
              <line x1="105" y1="65" x2="108" y2="69" />
            </g>
          )}
        </g>
      </svg>
    </div>
  );
};
