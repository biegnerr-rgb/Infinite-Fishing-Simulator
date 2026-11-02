import React, { useState } from 'react';
import { StoryCharacterDef, CharacterDialogue } from '../types/story';
import { X, MessageSquare, Sparkles, ArrowRight, Check } from 'lucide-react';
import { sound } from '../utils/audio';

interface StoryDialogueModalProps {
  character: StoryCharacterDef;
  dialogue: CharacterDialogue;
  onClose: () => void;
  onSelectOption: (optionIndex: number, rewardCoins?: number, rewardPearls?: number) => void;
}

export const StoryDialogueModal: React.FC<StoryDialogueModalProps> = ({
  character,
  dialogue,
  onClose,
  onSelectOption,
}) => {
  const [selectedResponse, setSelectedResponse] = useState<string | null>(null);
  const [claimedReward, setClaimedReward] = useState<{ coins?: number; pearls?: number } | null>(null);

  const handleChoose = (idx: number) => {
    const opt = dialogue.responseOptions?.[idx];
    if (!opt) return;

    sound.playClick();
    setSelectedResponse(opt.replyText);
    if (opt.rewardCoins || opt.rewardPearls) {
      setClaimedReward({ coins: opt.rewardCoins, pearls: opt.rewardPearls });
      sound.playCatchSuccess();
    }
    onSelectOption(idx, opt.rewardCoins, opt.rewardPearls);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-xl bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-amber-500/40 rounded-3xl shadow-2xl overflow-hidden text-white font-sans">
        
        {/* Header Bar */}
        <div className="px-5 py-3.5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">{character.avatar}</span>
            <div>
              <h3 className="text-sm font-black text-amber-200">{character.name}</h3>
              <p className="text-[10px] text-slate-400">{character.title}</p>
            </div>
          </div>
          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Character Portrait & Speech Bubble */}
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-950 border border-slate-700 flex items-center justify-center text-4xl shadow-lg shrink-0">
              {character.avatar}
            </div>

            <div className="flex-1 bg-slate-800/80 border border-slate-700 rounded-2xl p-4 relative shadow-md">
              {/* Pointer triangle */}
              <div className="absolute top-4 -left-2 w-0 h-0 border-t-8 border-t-transparent border-r-8 border-r-slate-800 border-b-8 border-b-transparent" />
              
              <p className="text-sm text-slate-100 leading-relaxed font-medium">
                {selectedResponse ? selectedResponse : dialogue.text}
              </p>

              {claimedReward && (
                <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-950/80 border border-emerald-600/50 text-emerald-300 text-xs font-bold animate-bounce">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>
                    Received {claimedReward.coins ? `+${claimedReward.coins.toLocaleString()} Coins` : ''} 
                    {claimedReward.pearls ? ` +${claimedReward.pearls} Star Pearls` : ''}!
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Interactive Player Choices */}
          {!selectedResponse && dialogue.responseOptions && dialogue.responseOptions.length > 0 && (
            <div className="space-y-2 pt-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block px-1">
                Your Response:
              </span>
              {dialogue.responseOptions.map((opt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleChoose(idx)}
                  className="w-full text-left p-3.5 rounded-2xl bg-slate-800/90 hover:bg-slate-700/90 border border-amber-600/30 hover:border-amber-500 text-slate-200 hover:text-white transition-all flex items-center justify-between gap-3 group cursor-pointer shadow-sm active:scale-[0.99]"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-amber-400 font-bold">💬</span>
                    <span className="text-xs font-bold">{opt.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {(opt.rewardCoins || opt.rewardPearls) && (
                      <span className="text-[10px] font-mono font-bold text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded-md border border-amber-600/40">
                        {opt.rewardCoins ? `+${opt.rewardCoins}🪙 ` : ''}
                        {opt.rewardPearls ? `+${opt.rewardPearls}🔮` : ''}
                      </span>
                    )}
                    <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Bottom Close Button when conversation ended */}
          {selectedResponse && (
            <div className="pt-2 flex justify-end">
              <button
                onClick={() => {
                  sound.playClick();
                  onClose();
                }}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-emerald-950 font-black text-xs shadow-lg transition-all active:scale-95 cursor-pointer flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>Continue Fishing</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
