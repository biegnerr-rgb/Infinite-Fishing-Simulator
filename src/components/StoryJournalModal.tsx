import React, { useState } from 'react';
import { 
  STORY_CHAPTERS, 
  JOURNAL_PAGES, 
  STORY_CHARACTERS, 
  STORY_QUESTS, 
  STORY_ARTIFACTS 
} from '../data/storyData';
import { StoryState, JournalPageDef, StoryCharacterDef } from '../types/story';
import { 
  BookOpen, 
  Scroll, 
  Users, 
  CheckCircle, 
  Sparkles, 
  Compass, 
  Lock, 
  X, 
  Award, 
  ChevronRight,
  MessageCircle
} from 'lucide-react';
import { sound } from '../utils/audio';

interface StoryJournalModalProps {
  storyState: StoryState;
  boatTier: number;
  totalFishCaught: number;
  unlockedLocations: string[];
  coins: number;
  starPearls: number;
  onClose: () => void;
  onTalkToCharacter: (charId: 'old_finn' | 'bubbles' | 'milo' | 'keeper') => void;
  onClaimQuestReward?: (questId: string) => void;
  onReadPage?: (pageId: string) => void;
}

export const StoryJournalModal: React.FC<StoryJournalModalProps> = ({
  storyState,
  boatTier,
  totalFishCaught,
  unlockedLocations,
  onClose,
  onTalkToCharacter,
  onClaimQuestReward,
  onReadPage,
}) => {
  const [activeTab, setActiveTab] = useState<'chapters' | 'journal' | 'characters' | 'quests' | 'relics'>('chapters');
  const [selectedPage, setSelectedPage] = useState<JournalPageDef | null>(() => {
    return JOURNAL_PAGES.find(p => storyState.collectedPageIds.includes(p.id)) || JOURNAL_PAGES[0];
  });
  const [selectedChar, setSelectedChar] = useState<StoryCharacterDef>(STORY_CHARACTERS[0]);

  const currentChapterDef = STORY_CHAPTERS.find(c => c.chapter === storyState.currentChapter) || STORY_CHAPTERS[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-4xl h-[88vh] max-h-[780px] bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-amber-600/40 rounded-3xl shadow-2xl flex flex-col overflow-hidden text-slate-100 font-sans">
        
        {/* Ornate Header Banner */}
        <div className="relative px-6 py-4 bg-gradient-to-r from-amber-950/70 via-slate-900 to-indigo-950/70 border-b border-amber-500/30 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-2xl shadow-inner">
              📖
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-amber-200 tracking-tight flex items-center gap-2">
                  <span>THE SECRETS OF THE INFINITE POND</span>
                </h2>
                <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  Chapter {storyState.currentChapter} / 5
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Grandfather Arthur’s Logbook & The Awakening of the Guardians
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              sound.playClick();
              onClose();
            }}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer border border-slate-700"
            title="Close Journal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1.5 px-6 py-2.5 bg-slate-950/60 border-b border-slate-800 shrink-0 overflow-x-auto">
          {[
            { id: 'chapters', label: 'Story Chapters', icon: Scroll, count: `${storyState.currentChapter}/5` },
            { id: 'journal', label: 'Grandpa’s Log', icon: BookOpen, count: `${storyState.collectedPageIds.length}/12` },
            { id: 'characters', label: 'Companions', icon: Users, count: `${STORY_CHARACTERS.length}` },
            { id: 'quests', label: 'Story Quests', icon: Award, count: `${storyState.completedQuestIds.length}/${STORY_QUESTS.length}` },
            { id: 'relics', label: 'Guardian Relics', icon: Sparkles, count: `${storyState.collectedArtifactIds.length}/${STORY_ARTIFACTS.length}` },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  sound.playClick();
                  setActiveTab(tab.id as any);
                }}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-amber-600/30 text-amber-200 border border-amber-500/50 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-amber-400' : 'text-slate-500'}`} />
                <span>{tab.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  isActive ? 'bg-amber-500/30 text-amber-200' : 'bg-slate-800 text-slate-400'
                }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 bg-slate-900/40">

          {/* TAB 1: CHAPTERS & PROGRESSION */}
          {activeTab === 'chapters' && (
            <div className="space-y-6 max-w-3xl mx-auto">
              {/* Current Chapter Hero Card */}
              <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-950/40 via-slate-800/70 to-indigo-950/40 border border-amber-500/40 shadow-lg">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{currentChapterDef.icon}</span>
                      <h3 className="text-lg font-black text-amber-200">
                        Chapter {currentChapterDef.chapter}: {currentChapterDef.title}
                      </h3>
                    </div>
                    <p className="text-xs font-semibold text-amber-400/90 italic">
                      "{currentChapterDef.subtitle}"
                    </p>
                    <p className="text-xs text-slate-300 leading-relaxed pt-1">
                      {currentChapterDef.description}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[11px] font-bold text-slate-400 block">Guardian</span>
                    <span className="text-xs font-black text-indigo-300">{currentChapterDef.guardianName}</span>
                    <span className="text-[10px] text-slate-400 block">{currentChapterDef.guardianTitle}</span>
                  </div>
                </div>
              </div>

              {/* Timeline of All 5 Chapters */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Chronicle of the Great Awakening
                </h4>
                <div className="space-y-3">
                  {STORY_CHAPTERS.map(ch => {
                    const isCompleted = storyState.completedChapters.includes(ch.chapter);
                    const isCurrent = storyState.currentChapter === ch.chapter;
                    const isLocked = !isCompleted && !isCurrent && ch.chapter > storyState.currentChapter;

                    return (
                      <div
                        key={ch.chapter}
                        className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-4 ${
                          isCompleted
                            ? 'bg-slate-900/60 border-emerald-600/40'
                            : isCurrent
                            ? 'bg-amber-950/30 border-amber-500/50 shadow-md ring-1 ring-amber-500/30'
                            : 'bg-slate-950/40 border-slate-800 opacity-60'
                        }`}
                      >
                        <div className="flex items-center gap-3.5">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${
                            isCompleted
                              ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-700/50'
                              : isCurrent
                              ? 'bg-amber-950/80 text-amber-400 border border-amber-600/50 animate-pulse'
                              : 'bg-slate-800 text-slate-500'
                          }`}>
                            {isCompleted ? '✓' : isLocked ? '🔒' : ch.icon}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-sm text-slate-100">
                                Chapter {ch.chapter}: {ch.title}
                              </span>
                              {isCurrent && (
                                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                  In Progress
                                </span>
                              )}
                              {isCompleted && (
                                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                  Restored
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5">
                              Guardian: <span className="text-indigo-300 font-semibold">{ch.guardianName}</span> ({ch.guardianTitle})
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-[10px] text-slate-400 block">Reward</span>
                          <span className="text-xs font-mono font-bold text-purple-300">
                            🔮 {ch.rewardPearls} Star Pearls
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: GRANDPA'S LOGBOOK */}
          {activeTab === 'journal' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 h-full">
              {/* Left Column: Pages List */}
              <div className="md:col-span-4 space-y-2 max-h-[550px] overflow-y-auto pr-1">
                <div className="text-xs font-bold text-slate-400 px-1 pb-1 flex items-center justify-between">
                  <span>Logbook Entries</span>
                  <span>{storyState.collectedPageIds.length} / 12 Discovered</span>
                </div>
                {JOURNAL_PAGES.map(page => {
                  const isUnlocked = storyState.collectedPageIds.includes(page.id);
                  const isSelected = selectedPage?.id === page.id;

                  return (
                    <button
                      key={page.id}
                      onClick={() => {
                        if (isUnlocked) {
                          sound.playClick();
                          setSelectedPage(page);
                          onReadPage?.(page.id);
                        }
                      }}
                      className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between gap-2 cursor-pointer ${
                        isSelected
                          ? 'bg-amber-950/60 border-amber-500 text-amber-100 shadow-md ring-1 ring-amber-500/40'
                          : isUnlocked
                          ? 'bg-slate-800/70 border-slate-700/70 hover:bg-slate-700/60 text-slate-200'
                          : 'bg-slate-950/40 border-slate-800/80 text-slate-500 opacity-60 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        <span className="text-sm shrink-0">
                          {isUnlocked ? '📜' : '🔒'}
                        </span>
                        <div className="truncate">
                          <div className="text-xs font-black truncate">
                            {isUnlocked ? `Page #${page.pageNumber}: ${page.title}` : `Page #${page.pageNumber}: Lost to Time`}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">
                            {isUnlocked ? page.date : 'Search waters & complete quests'}
                          </div>
                        </div>
                      </div>
                      <ChevronRight className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-amber-400' : 'text-slate-600'}`} />
                    </button>
                  );
                })}
              </div>

              {/* Right Column: Illustrated Vintage Journal Reader */}
              <div className="md:col-span-8 flex flex-col h-full bg-[#fdf6e2] text-[#3c2a1e] rounded-2xl p-6 border-2 border-[#d4af37]/60 shadow-xl overflow-y-auto relative">
                {selectedPage && storyState.collectedPageIds.includes(selectedPage.id) ? (
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="border-b-2 border-[#c29b38]/40 pb-3 flex items-start justify-between">
                      <div>
                        <div className="text-[11px] font-serif uppercase tracking-widest text-[#8b6508]">
                          Grandfather Arthur’s Expedition Log • Page #{selectedPage.pageNumber}
                        </div>
                        <h3 className="text-xl font-bold font-serif text-[#2a1b12] mt-0.5">
                          {selectedPage.title}
                        </h3>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-serif italic text-[#6d4c1b]">{selectedPage.date}</span>
                        <span className="text-[10px] block font-mono text-[#8b6508]">Location: Pond Waters</span>
                      </div>
                    </div>

                    {/* Content Paragraphs */}
                    <div className="space-y-3 font-serif text-sm leading-relaxed text-[#3c2a1e]">
                      {selectedPage.content.map((p, idx) => (
                        <p key={idx} className="indent-4">
                          {p}
                        </p>
                      ))}
                    </div>

                    {/* Vintage Hand-Drawn Sketch Ornament */}
                    <div className="pt-4 border-t border-[#c29b38]/30 flex items-center justify-between text-xs text-[#8b6508] font-serif italic">
                      <div className="flex items-center gap-2">
                        <span>✒️ Signed: {selectedPage.author}</span>
                      </div>
                      <span className="text-[11px] text-[#a17822]">
                        Next clue: {selectedPage.hintForNext}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3">
                    <Lock className="w-10 h-10 text-[#a17822]/60" />
                    <h4 className="text-base font-serif font-bold text-[#3c2a1e]">
                      This Logbook Page is Drifting in the Waters
                    </h4>
                    <p className="text-xs font-serif text-[#6d4c1b] max-w-sm">
                      {selectedPage?.hintForNext || 'Keep fishing, complete story quests, or look for floating message bottles in the pond.'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: CHARACTERS & COMPANIONS */}
          {activeTab === 'characters' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 h-full">
              {/* Character List */}
              <div className="md:col-span-4 space-y-2">
                <div className="text-xs font-bold text-slate-400 px-1 pb-1">
                  Residents of the Infinite Pond
                </div>
                {STORY_CHARACTERS.map(c => {
                  const isSelected = selectedChar.id === c.id;
                  return (
                    <button
                      key={c.id}
                      onClick={() => {
                        sound.playClick();
                        setSelectedChar(c);
                      }}
                      className={`w-full text-left p-3 rounded-2xl border transition-all flex items-center gap-3 cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-950/70 border-indigo-500 text-white shadow-md ring-1 ring-indigo-500/40'
                          : 'bg-slate-800/70 border-slate-700/70 hover:bg-slate-700/60 text-slate-200'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-xl bg-slate-700/60 border border-slate-600 flex items-center justify-center text-xl shrink-0">
                        {c.avatar}
                      </div>
                      <div className="truncate">
                        <div className="font-extrabold text-sm">{c.name}</div>
                        <div className="text-[10px] text-slate-400 truncate">{c.title}</div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Character Profile & Dialogue Hub */}
              <div className="md:col-span-8 p-5 rounded-2xl bg-slate-800/60 border border-slate-700/80 flex flex-col justify-between space-y-4">
                <div className="space-y-4">
                  <div className="flex items-start justify-between border-b border-slate-700 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-700 flex items-center justify-center text-3xl shadow-md">
                        {selectedChar.avatar}
                      </div>
                      <div>
                        <h3 className="text-lg font-black text-white">{selectedChar.name}</h3>
                        <p className="text-xs text-indigo-400 font-semibold">{selectedChar.title}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Favorite Catch: <span className="text-amber-300">{selectedChar.favoriteCatch}</span>
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        sound.playClick();
                        onTalkToCharacter(selectedChar.id);
                      }}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-amber-950 font-black text-xs flex items-center gap-1.5 shadow-md transition-all active:scale-95 cursor-pointer"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>Talk Now</span>
                    </button>
                  </div>

                  <div>
                    <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Lore & Personality</h5>
                    <p className="text-xs text-slate-300 leading-relaxed mt-1">
                      {selectedChar.description}
                    </p>
                    <p className="text-xs text-slate-400 mt-2">
                      <strong className="text-slate-300">Demeanor:</strong> {selectedChar.personality}
                    </p>
                  </div>

                  <div>
                    <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">Available Memories & Advice</h5>
                    <div className="space-y-2">
                      {selectedChar.dialogues.map(d => {
                        const isUnlocked = storyState.currentChapter >= d.chapterRequired;
                        return (
                          <div
                            key={d.id}
                            className={`p-3 rounded-xl border text-xs leading-relaxed ${
                              isUnlocked
                                ? 'bg-slate-900/60 border-slate-700/80 text-slate-300'
                                : 'bg-slate-950/40 border-slate-800 text-slate-600'
                            }`}
                          >
                            {isUnlocked ? (
                              <div className="space-y-1">
                                <p className="italic">"{d.text}"</p>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2">
                                <Lock className="w-3.5 h-3.5 text-slate-600" />
                                <span>Unlocks in Chapter {d.chapterRequired}</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: STORY QUESTS */}
          {activeTab === 'quests' && (
            <div className="space-y-4 max-w-3xl mx-auto">
              <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                <span className="text-xs font-bold text-slate-400">Chapter Quests & Objectives</span>
                <span className="text-xs text-amber-400 font-mono font-bold">
                  {storyState.completedQuestIds.length} / {STORY_QUESTS.length} Completed
                </span>
              </div>

              <div className="space-y-3">
                {STORY_QUESTS.map(quest => {
                  const isDone = storyState.completedQuestIds.includes(quest.id);
                  const isChapterActive = quest.chapter <= storyState.currentChapter;

                  return (
                    <div
                      key={quest.id}
                      className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-4 ${
                        isDone
                          ? 'bg-slate-900/60 border-emerald-600/40'
                          : isChapterActive
                          ? 'bg-slate-800/80 border-slate-700 shadow-sm'
                          : 'bg-slate-950/40 border-slate-800 opacity-60'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-sm ${
                          isDone 
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-700' 
                            : 'bg-slate-700 text-slate-300'
                        }`}>
                          {isDone ? '✓' : quest.chapter}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-sm text-slate-100">{quest.title}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">
                              Ch. {quest.chapter}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">{quest.description}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <div className="text-xs font-mono font-bold text-amber-300">
                            +{quest.rewardCoins.toLocaleString()} 🪙
                          </div>
                          <div className="text-[11px] font-mono font-bold text-purple-300">
                            +{quest.rewardPearls} 🔮
                          </div>
                        </div>

                        {isDone ? (
                          <div className="px-3 py-1 rounded-xl bg-emerald-950 text-emerald-400 border border-emerald-800 text-xs font-bold">
                            Claimed
                          </div>
                        ) : isChapterActive ? (
                          <button
                            onClick={() => {
                              onClaimQuestReward?.(quest.id);
                            }}
                            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-emerald-950 font-black text-xs shadow-md transition-all active:scale-95 cursor-pointer"
                          >
                            Check / Claim
                          </button>
                        ) : (
                          <div className="px-3 py-1 rounded-xl bg-slate-800 text-slate-500 text-xs">
                            Locked
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 5: GUARDIAN ARTIFACTS & RELICS */}
          {activeTab === 'relics' && (
            <div className="space-y-4 max-w-3xl mx-auto">
              <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/40">
                <h4 className="text-sm font-black text-indigo-200">The 4 Ancient Keystones</h4>
                <p className="text-xs text-slate-300 mt-1">
                  Each relic was forged by an ancient guardian to govern the flow of tides and starlight. Restoring them grants permanent passive blessings to your vessel and fishing prowess.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {STORY_ARTIFACTS.map(artifact => {
                  const isOwned = storyState.collectedArtifactIds.includes(artifact.id);

                  return (
                    <div
                      key={artifact.id}
                      className={`p-4 rounded-2xl border transition-all ${
                        isOwned
                          ? 'bg-slate-800/80 border-amber-500/50 shadow-md ring-1 ring-amber-500/30'
                          : 'bg-slate-950/50 border-slate-800 opacity-65'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0 ${
                          isOwned
                            ? 'bg-amber-950/80 border border-amber-500/60 shadow-inner'
                            : 'bg-slate-800 border border-slate-700'
                        }`}>
                          {isOwned ? artifact.icon : '🔒'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h5 className="font-extrabold text-sm text-slate-100">{artifact.name}</h5>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-700 text-slate-300">
                              Ch. {artifact.chapter}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">{artifact.description}</p>
                          <div className="mt-2 text-xs font-bold text-amber-300 bg-amber-950/40 px-2 py-1 rounded-lg border border-amber-600/30">
                            ✨ {artifact.passiveBonus}
                          </div>
                          <div className="mt-1 text-[10px] text-slate-400 italic">
                            Guardian: {artifact.guardianName}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
