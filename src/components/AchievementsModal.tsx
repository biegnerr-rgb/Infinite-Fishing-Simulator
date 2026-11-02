import React from 'react';
import { AchievementDef, GameSaveState } from '../types/game';
import { ACHIEVEMENTS } from '../data/achievementsData';
import { X, Award, CheckCircle2, Lock, Trophy } from 'lucide-react';
import { sound } from '../utils/audio';

interface AchievementsModalProps {
  saveState: GameSaveState;
  unlockedAchievements: string[];
  onClaimReward?: (achievement: AchievementDef) => void;
  onClose: () => void;
}

export const AchievementsModal: React.FC<AchievementsModalProps> = ({
  saveState,
  unlockedAchievements,
  onClose,
}) => {
  const completedCount = ACHIEVEMENTS.filter(a => a.isUnlocked(saveState)).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md select-none text-white animate-fade-in">
      <div className="relative w-full max-w-3xl h-[85vh] flex flex-col rounded-3xl bg-slate-900 border border-slate-700 shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center text-xl shadow-md text-slate-950 font-bold">
              🏆
            </div>
            <div>
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                <span>Milestones & Trophies</span>
              </h2>
              <p className="text-xs text-slate-400">
                Unlock achievements to celebrate your angling journey across the universe.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-3 py-1.5 rounded-xl bg-amber-950/80 border border-amber-600/50 text-amber-300 font-extrabold text-xs">
              {completedCount} / {ACHIEVEMENTS.length} Completed
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Achievements List */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {ACHIEVEMENTS.map((ach) => {
              const isDone = ach.isUnlocked(saveState);

              return (
                <div
                  key={ach.id}
                  className={`p-3.5 rounded-2xl border transition-all ${
                    isDone
                      ? 'bg-slate-800/80 border-amber-500/50 shadow-md'
                      : 'bg-slate-950/50 border-slate-800/80 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0 ${
                        isDone ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-slate-800 text-slate-500'
                      }`}>
                        {isDone ? '🏆' : '🔒'}
                      </div>
                      <div>
                        <h4 className="font-black text-xs text-white">
                          {ach.title}
                        </h4>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {ach.description}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          {ach.rewardCoins > 0 && (
                            <span className="text-[10px] font-bold text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/50">
                              +🪙 {ach.rewardCoins.toLocaleString()}
                            </span>
                          )}
                          {ach.rewardPearls > 0 && (
                            <span className="text-[10px] font-bold text-purple-300 bg-purple-950/60 px-2 py-0.5 rounded border border-purple-800/50">
                              +🔮 {ach.rewardPearls} Pearls
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {isDone && (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-1" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
};
