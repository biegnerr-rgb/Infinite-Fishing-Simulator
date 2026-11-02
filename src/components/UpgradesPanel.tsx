import React, { useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Archive,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Clover,
  Compass,
  Fish,
  Layers,
  LockKeyhole,
  Package,
  Radio,
  Sparkles,
  Waves,
  Zap,
} from 'lucide-react';
import { UPGRADES } from '../data/upgradesData';
import { sound } from '../utils/audio';

interface UpgradesPanelProps {
  coins: number;
  upgrades: Record<string, number>;
  boatTier?: number;
  onBuyUpgrade: (upgradeId: string) => void;
  onOpenShipyard?: () => void;
}

type ShopCategory = 'all' | 'rods' | 'bait' | 'auto' | 'lines' | 'luck' | 'storage' | 'special';
type EquipmentGrade = 'ordinary' | 'rare' | 'special';

interface UpgradeVisual {
  icon: LucideIcon;
  grade: EquipmentGrade;
  label: string;
}

const INITIAL_LEVELS: Record<string, number> = {
  fishing_rod: 1,
  multiple_lines: 1,
  pond_expansion: 1,
};

const UPGRADE_VISUALS: Record<string, UpgradeVisual> = {
  fishing_rod: { icon: Fish, grade: 'rare', label: 'HANDCRAFTED' },
  lucky_bait: { icon: Clover, grade: 'rare', label: 'ENCHANTED' },
  auto_fisher: { icon: Zap, grade: 'ordinary', label: 'AUTOMATION' },
  multiple_lines: { icon: Layers, grade: 'rare', label: 'BRAIDED GEAR' },
  auto_seller: { icon: Package, grade: 'special', label: 'POND HELPER' },
  pond_expansion: { icon: Waves, grade: 'ordinary', label: 'PONDKEEPING' },
  offline_catcher: { icon: Archive, grade: 'special', label: 'OVERNIGHT KIT' },
  sonar_scanner: { icon: Radio, grade: 'special', label: 'DEPTH TECH' },
};

const CATEGORY_UPGRADES: Record<Exclude<ShopCategory, 'all'>, string[]> = {
  rods: ['fishing_rod'],
  bait: ['lucky_bait'],
  auto: ['auto_fisher', 'auto_seller', 'offline_catcher'],
  lines: ['multiple_lines'],
  luck: ['lucky_bait'],
  storage: ['pond_expansion'],
  special: ['auto_seller', 'offline_catcher', 'sonar_scanner'],
};

const CATEGORY_DEFINITIONS: { id: ShopCategory; label: string; icon: LucideIcon }[] = [
  { id: 'all', label: 'All gear', icon: Compass },
  { id: 'rods', label: 'Rods', icon: Fish },
  { id: 'bait', label: 'Bait', icon: Clover },
  { id: 'auto', label: 'Auto fishing', icon: Zap },
  { id: 'lines', label: 'Fishing lines', icon: Layers },
  { id: 'luck', label: 'Luck', icon: Sparkles },
  { id: 'storage', label: 'Storage', icon: Archive },
  { id: 'special', label: 'Special gear', icon: Radio },
];

const LOCKED_PREVIEWS: {
  id: string;
  category: Exclude<ShopCategory, 'all'>;
  name: string;
  description: string;
  icon: LucideIcon;
  grade: EquipmentGrade;
}[] = [
  { id: 'moonlit-rod', category: 'rods', name: 'Moonlit Pearlcaster', description: 'A starlit reel for casting past the edge of the known waters.', icon: Fish, grade: 'special' },
  { id: 'glowworm-bait', category: 'bait', name: 'Glowworm Gumdrops', description: 'Tiny lantern-like morsels said to charm the shyest fish.', icon: Sparkles, grade: 'rare' },
  { id: 'tide-clock', category: 'auto', name: 'Tidekeeper Clockwork', description: 'A hand-wound helper that keeps every float bobbing along.', icon: Zap, grade: 'special' },
  { id: 'moonthread-line', category: 'lines', name: 'Moonthread Line', description: 'Silvery, almost invisible thread made for mysterious catches.', icon: Layers, grade: 'rare' },
  { id: 'lucky-compass', category: 'luck', name: 'Fortune-Finder Compass', description: 'Its needle points toward the fish that got away.', icon: Compass, grade: 'special' },
  { id: 'shell-locker', category: 'storage', name: 'Seashell Keepsake Locker', description: 'A roomy little chest for treasures from every trip.', icon: Archive, grade: 'rare' },
  { id: 'deepwater-radio', category: 'special', name: 'Abyssal Listening Set', description: 'Picks up curious songs from far below the lily pads.', icon: Radio, grade: 'special' },
];

export const UpgradesPanel: React.FC<UpgradesPanelProps> = ({
  coins,
  upgrades,
  boatTier = 1,
  onBuyUpgrade,
  onOpenShipyard,
}) => {
  const [activeCategory, setActiveCategory] = useState<ShopCategory>('all');
  const [recentlyPurchased, setRecentlyPurchased] = useState<string | null>(null);

  const upgradeKeys = Object.keys(UPGRADES);
  const visibleUpgradeKeys = activeCategory === 'all'
    ? upgradeKeys
    : CATEGORY_UPGRADES[activeCategory].filter((key) => UPGRADES[key]);
  const visiblePreviews = activeCategory === 'all'
    ? LOCKED_PREVIEWS
    : LOCKED_PREVIEWS.filter((preview) => preview.category === activeCategory);

  const handlePurchase = (upgradeId: string) => {
    const definition = UPGRADES[upgradeId];
    if (!definition) return;

    const currentLevel = upgrades[upgradeId] ?? INITIAL_LEVELS[upgradeId] ?? 0;
    const cost = Math.floor(definition.baseCost * Math.pow(definition.costMultiplier, currentLevel));
    if (currentLevel >= definition.maxLevel || coins < cost) return;

    onBuyUpgrade(upgradeId);
    sound.playUpgrade();
    setRecentlyPurchased(upgradeId);
    window.setTimeout(() => {
      setRecentlyPurchased((current) => current === upgradeId ? null : current);
    }, 1100);
  };

  return (
    <section className="upgrade-shop" aria-labelledby="upgrade-shop-title">
      <header className="upgrade-shop-header">
        <div className="upgrade-shop-heading">
          <div>
            <span className="workshop-eyebrow"><Sparkles aria-hidden="true" /> THE TACKLE SHED</span>
            <h2 id="upgrade-shop-title">Upgrade bench</h2>
            <p>Good gear makes every quiet cast count.</p>
          </div>
          <div className="workshop-stamp" aria-hidden="true"><span>EST.</span><strong>’24</strong></div>
        </div>

        <div className="workshop-utility-row">
          {onOpenShipyard && (
            <button className="workshop-boat-button" onClick={onOpenShipyard} title="Open the boat shipyard">
              <span className="boat-button-icon">⚓</span>
              <span><small>SHIPYARD</small><strong>Boat · Tier {boatTier}</strong></span>
              <ArrowRight aria-hidden="true" />
            </button>
          )}
          <div className="workshop-wallet" aria-label={`${coins.toLocaleString()} coins available`}>
            <span className="coin-sun" aria-hidden="true">✦</span>
            <span><small>YOUR PURSE</small><strong>{coins.toLocaleString()} <em>coins</em></strong></span>
          </div>
        </div>
      </header>

      <nav className="upgrade-categories" aria-label="Upgrade categories">
        {CATEGORY_DEFINITIONS.map((category) => {
          const CategoryIcon = category.icon;
          const count = category.id === 'all'
            ? upgradeKeys.length
            : CATEGORY_UPGRADES[category.id].filter((key) => UPGRADES[key]).length;

          return (
            <button
              key={category.id}
              type="button"
              className={`upgrade-category${activeCategory === category.id ? ' is-active' : ''}`}
              aria-pressed={activeCategory === category.id}
              onClick={() => setActiveCategory(category.id)}
            >
              <CategoryIcon aria-hidden="true" />
              <span>{category.label}</span>
              <small>{count}</small>
            </button>
          );
        })}
      </nav>

      <div className="upgrade-scroll" key={activeCategory}>
        <div className="upgrade-section-heading">
          <div>
            <span>THE WORKBENCH</span>
            <h3>{CATEGORY_DEFINITIONS.find((category) => category.id === activeCategory)?.label}</h3>
          </div>
          <span className="upgrade-stock-count">{visibleUpgradeKeys.length} {visibleUpgradeKeys.length === 1 ? 'upgrade' : 'upgrades'}</span>
        </div>

        <div className="upgrade-list">
          {visibleUpgradeKeys.map((key) => {
            const definition = UPGRADES[key];
            const visual = UPGRADE_VISUALS[key] ?? { icon: Sparkles, grade: 'ordinary' as const, label: 'TACKLE' };
            const UpgradeIcon = visual.icon;
            const currentLevel = upgrades[key] ?? INITIAL_LEVELS[key] ?? 0;
            const isMax = currentLevel >= definition.maxLevel;
            const cost = Math.floor(definition.baseCost * Math.pow(definition.costMultiplier, currentLevel));
            const canAfford = !isMax && coins >= cost;
            const isFresh = recentlyPurchased === key;
            const progress = Math.min(100, Math.round((currentLevel / definition.maxLevel) * 100));

            return (
              <article
                key={key}
                className={`upgrade-card grade-${visual.grade}${isMax ? ' is-maxed' : ''}${isFresh ? ' is-fresh' : ''}`}
              >
                <div className="upgrade-card-topline">
                  <div className={`upgrade-art grade-${visual.grade}`} aria-hidden="true">
                    <UpgradeIcon />
                    <span className="upgrade-art-glint">✦</span>
                  </div>
                  <div className="upgrade-card-identity">
                    <div className="upgrade-name-row">
                      <h4>{definition.name}</h4>
                      <span className={`grade-tag grade-${visual.grade}`}>{visual.label}</span>
                    </div>
                    <span className="upgrade-level-tag">
                      {isMax ? 'MAX LEVEL' : `LEVEL ${currentLevel} / ${definition.maxLevel}`}
                    </span>
                  </div>
                </div>

                <p className="upgrade-description">{definition.description}</p>

                <div className="upgrade-progress-block">
                  <div className="upgrade-progress-labels">
                    <span>{isMax ? 'WORKSHOP MASTERY' : 'UPGRADE PROGRESS'}</span>
                    <strong>{progress}%</strong>
                  </div>
                  <div
                    className="upgrade-progress-track"
                    role="progressbar"
                    aria-label={`${definition.name} upgrade level`}
                    aria-valuemin={0}
                    aria-valuemax={definition.maxLevel}
                    aria-valuenow={currentLevel}
                  >
                    <span className={`upgrade-progress-fill grade-${visual.grade}`} style={{ width: `${progress}%` }} />
                  </div>
                  <div className="upgrade-level-markers"><span>LEVEL {currentLevel}</span><span>LEVEL {definition.maxLevel}</span></div>
                </div>

                <div className="upgrade-effect-preview">
                  <div className="upgrade-effect-row">
                    <span className="effect-label">NOW</span>
                    <span>{definition.effectDescription(currentLevel)}</span>
                  </div>
                  {!isMax && (
                    <div className="upgrade-effect-row next-effect">
                      <span className="effect-label"><ArrowUpRight aria-hidden="true" /> NEXT</span>
                      <span>{definition.effectDescription(currentLevel + 1)}</span>
                    </div>
                  )}
                </div>

                <div className="upgrade-purchase-row">
                  {isMax ? (
                    <div className="upgrade-maxed-message"><CheckCircle2 aria-hidden="true" /> Fully tuned up</div>
                  ) : (
                    <>
                      <div className="upgrade-price">
                        <span className="price-coin" aria-hidden="true">✦</span>
                        <span><strong>{cost.toLocaleString()}</strong><small>COINS</small></span>
                      </div>
                      <button
                        type="button"
                        className={`upgrade-buy-button${canAfford ? '' : ' is-unaffordable'}`}
                        disabled={!canAfford}
                        onClick={() => handlePurchase(key)}
                        aria-label={canAfford ? `Purchase ${definition.name} for ${cost.toLocaleString()} coins` : `Need ${Math.max(0, cost - coins).toLocaleString()} more coins for ${definition.name}`}
                      >
                        {canAfford ? <>Tune up <ArrowRight aria-hidden="true" /></> : <>Need {Math.max(0, cost - coins).toLocaleString()} more</>}
                      </button>
                    </>
                  )}
                </div>

                {isFresh && <div className="upgrade-installed-toast" role="status">UPGRADE INSTALLED</div>}
              </article>
            );
          })}
        </div>

        {visiblePreviews.length > 0 && (
          <section className="locked-preview-section" aria-label="Locked equipment previews">
            <div className="upgrade-section-heading preview-heading">
              <div><span>PINNED TO THE NOTICEBOARD</span><h3>On the horizon</h3></div>
              <LockKeyhole aria-hidden="true" />
            </div>
            <div className="upgrade-list">
              {visiblePreviews.map((preview) => {
                const PreviewIcon = preview.icon;
                return (
                  <article className={`upgrade-card locked-card grade-${preview.grade}`} key={preview.id}>
                    <div className="upgrade-card-topline">
                      <div className={`upgrade-art grade-${preview.grade} is-locked`} aria-hidden="true"><PreviewIcon /><span className="lock-art"><LockKeyhole /></span></div>
                      <div className="upgrade-card-identity">
                        <div className="upgrade-name-row"><h4>{preview.name}</h4><span className={`grade-tag grade-${preview.grade}`}>{preview.grade}</span></div>
                        <span className="upgrade-level-tag locked-level-tag">BLUEPRINT LOCKED</span>
                      </div>
                    </div>
                    <p className="upgrade-description">{preview.description}</p>
                    <div className="preview-lock-note"><LockKeyhole aria-hidden="true" /><span>Preview concept · not available to purchase</span><Sparkles aria-hidden="true" /></div>
                  </article>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </section>
  );
};
