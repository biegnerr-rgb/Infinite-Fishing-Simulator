import React from 'react';
import { BOAT_TIERS } from '../data/storyData';
import { X, CheckCircle2, Anchor, Sparkles, Zap, Package, ArrowUpRight } from 'lucide-react';
import { sound } from '../utils/audio';

interface ShipyardModalProps {
  currentBoatTier: number;
  coins: number;
  onUpgradeBoat: (targetTier: number) => void;
  onClose: () => void;
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 2147483000,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '16px',
  background: 'rgba(2, 6, 23, 0.97)',
  backdropFilter: 'blur(8px)',
  color: '#f8fafc',
  fontFamily: 'Arial, sans-serif',
};

const panelStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  width: 'min(980px, 100%)',
  height: 'min(780px, 92dvh)',
  minHeight: 0,
  overflow: 'hidden',
  border: '1px solid rgba(34, 211, 238, .45)',
  borderRadius: '22px',
  background: 'linear-gradient(160deg, #0f2537 0%, #0f172a 55%, #07111f 100%)',
  boxShadow: '0 28px 90px rgba(0,0,0,.65)',
};

export const ShipyardModal: React.FC<ShipyardModalProps> = ({
  currentBoatTier,
  coins,
  onUpgradeBoat,
  onClose,
}) => {
  const currentDef = BOAT_TIERS.find(b => b.tier === currentBoatTier) || BOAT_TIERS[0];

  if (!currentDef) {
    return (
      <div style={overlayStyle} role="dialog" aria-modal="true" aria-label="Shipyard">
        <div style={{ ...panelStyle, height: 'auto', padding: '28px', gap: '16px' }}>
          <h2 style={{ margin: 0, fontSize: '22px' }}>Shipyard unavailable</h2>
          <p style={{ margin: 0, color: '#cbd5e1' }}>The boat upgrade data could not be loaded. Please close this window and try again.</p>
          <button type="button" onClick={onClose} style={{ alignSelf: 'flex-end', padding: '10px 16px', borderRadius: '10px', border: 0, cursor: 'pointer' }}>Close</button>
        </div>
      </div>
    );
  }

  return (
    <div style={overlayStyle} role="dialog" aria-modal="true" aria-label="Pond Shipyard">
      <div style={panelStyle}>
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', padding: '18px 22px', borderBottom: '1px solid rgba(34,211,238,.25)', background: 'rgba(8,47,73,.45)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '13px', minWidth: 0 }}>
            <div style={{ display: 'grid', placeItems: 'center', width: '44px', height: '44px', flex: '0 0 auto', borderRadius: '13px', background: 'rgba(6,182,212,.16)', color: '#a5f3fc' }}>
              <Anchor size={24} />
            </div>
            <div style={{ minWidth: 0 }}>
              <h2 style={{ margin: 0, color: '#cffafe', fontSize: 'clamp(16px, 2.5vw, 22px)', fontWeight: 900 }}>POND SHIPYARD</h2>
              <p style={{ margin: '4px 0 0', color: '#cbd5e1', fontSize: '12px' }}>Upgrade your boat and explore farther</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: '0 0 auto' }}>
            <strong style={{ color: '#fcd34d', fontSize: '13px', whiteSpace: 'nowrap' }}>🪙 {coins.toLocaleString()}</strong>
            <button type="button" aria-label="Close shipyard" onClick={() => { sound.playClick(); onClose(); }} style={{ display: 'grid', placeItems: 'center', width: '38px', height: '38px', border: '1px solid #475569', borderRadius: '10px', background: '#1e293b', color: '#f8fafc', cursor: 'pointer' }}>
              <X size={20} />
            </button>
          </div>
        </header>

        <section style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '14px 22px', background: 'rgba(2,6,23,.55)', borderBottom: '1px solid #1e293b' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '30px' }}>{currentDef.icon}</span>
            <div>
              <div style={{ color: '#94a3b8', fontSize: '11px', fontWeight: 700 }}>CURRENT BOAT · TIER {currentBoatTier}/5</div>
              <strong style={{ color: '#67e8f9', fontSize: '14px' }}>{currentDef.name}</strong>
            </div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '11px', fontWeight: 700 }}>
            <span style={{ color: '#6ee7b7' }}><Zap size={13} style={{ verticalAlign: 'middle' }} /> +{currentDef.biteSpeedBonus}% bite speed</span>
            <span style={{ color: '#fcd34d' }}><Sparkles size={13} style={{ verticalAlign: 'middle' }} /> +{currentDef.luckBonus}% rare luck</span>
            <span style={{ color: '#67e8f9' }}><Package size={13} style={{ verticalAlign: 'middle' }} /> +{currentDef.capacityBonus} slots</span>
          </div>
        </section>

        <div style={{ flex: '1 1 auto', minHeight: 0, overflowY: 'auto', padding: '16px 20px', display: 'grid', gap: '12px', alignContent: 'start' }}>
          {BOAT_TIERS.map(boat => {
            const isCurrent = boat.tier === currentBoatTier;
            const isPurchased = boat.tier < currentBoatTier;
            const isNext = boat.tier === currentBoatTier + 1;
            const canAfford = coins >= boat.cost;
            const borderColor = isCurrent ? '#0891b2' : isNext && canAfford ? '#d97706' : '#334155';
            const background = isCurrent ? 'rgba(8,145,178,.13)' : isPurchased ? 'rgba(30,41,59,.6)' : '#0b1627';

            return (
              <article key={boat.tier} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '14px', padding: '16px', border: `1px solid ${borderColor}`, borderRadius: '15px', background }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '13px', flex: '1 1 340px', minWidth: 0 }}>
                  <div style={{ display: 'grid', placeItems: 'center', width: '54px', height: '54px', flex: '0 0 auto', borderRadius: '14px', background: '#1e293b', fontSize: '30px' }}>{boat.icon}</div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '7px' }}>
                      <strong style={{ color: '#f8fafc', fontSize: '15px' }}>{boat.name}</strong>
                      <span style={{ padding: '3px 7px', borderRadius: '6px', background: '#1e293b', color: '#cbd5e1', fontSize: '10px', fontWeight: 800 }}>TIER {boat.tier}</span>
                      {isCurrent && <span style={{ color: '#67e8f9', fontSize: '10px', fontWeight: 900 }}>✓ ACTIVE BOAT</span>}
                    </div>
                    <div style={{ marginTop: '3px', color: '#67e8f9', fontSize: '12px' }}>{boat.subtitle}</div>
                    <p style={{ margin: '6px 0', maxWidth: '600px', color: '#94a3b8', fontSize: '12px', lineHeight: 1.5 }}>{boat.description}</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {boat.features.map((feature, index) => <span key={index} style={{ padding: '4px 7px', borderRadius: '6px', background: '#1e293b', color: '#cbd5e1', fontSize: '10px' }}>✦ {feature}</span>)}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', flex: '0 0 auto', minWidth: '180px' }}>
                  <div>
                    <div style={{ color: '#94a3b8', fontSize: '10px', fontWeight: 800 }}>SHIPYARD COST</div>
                    <strong style={{ color: '#fcd34d', fontSize: '14px' }}>{boat.cost === 0 ? 'Free' : `${boat.cost.toLocaleString()} coins`}</strong>
                  </div>
                  {isCurrent ? (
                    <span style={{ color: '#67e8f9', fontSize: '12px', fontWeight: 800 }}>At the helm</span>
                  ) : isPurchased ? (
                    <button type="button" onClick={() => { sound.playClick(); onUpgradeBoat(boat.tier); }} style={{ padding: '9px 12px', border: '1px solid #475569', borderRadius: '9px', background: '#1e293b', color: '#e2e8f0', fontWeight: 800, cursor: 'pointer' }}>Take out</button>
                  ) : isNext ? (
                    <button type="button" disabled={!canAfford} onClick={() => { if (canAfford) { sound.playUpgrade(); onUpgradeBoat(boat.tier); } }} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '10px 13px', border: 0, borderRadius: '9px', background: canAfford ? '#f59e0b' : '#334155', color: canAfford ? '#111827' : '#94a3b8', fontWeight: 900, cursor: canAfford ? 'pointer' : 'not-allowed' }}>
                      <ArrowUpRight size={15} /> {canAfford ? 'Upgrade boat' : 'Need more coins'}
                    </button>
                  ) : (
                    <span style={{ color: '#64748b', fontSize: '11px', fontWeight: 700 }}>Requires tier {boat.tier - 1}</span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
};
