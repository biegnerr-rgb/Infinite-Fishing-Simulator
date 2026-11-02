export interface BoatTierDef {
  tier: number;
  name: string;
  subtitle: string;
  cost: number; // in coins
  requiredPrestige?: number;
  icon: string;
  description: string;
  hullColor: string;
  accentColor: string;
  deckColor: string;
  biteSpeedBonus: number; // % faster bites
  luckBonus: number; // % higher chance of rare/variant fish
  capacityBonus: number; // extra inventory slots
  autoSpeedBonus: number; // % faster auto-fishing
  features: string[];
}

export interface CharacterDialogue {
  id: string;
  chapterRequired: number;
  speaker: 'old_finn' | 'bubbles' | 'milo' | 'keeper';
  text: string;
  responseOptions?: {
    label: string;
    replyText: string;
    rewardCoins?: number;
    rewardPearls?: number;
  }[];
  unlockedHint?: string;
}

export interface StoryCharacterDef {
  id: 'old_finn' | 'bubbles' | 'milo' | 'keeper';
  name: string;
  title: string;
  avatar: string;
  color: string;
  description: string;
  personality: string;
  favoriteCatch: string;
  dialogues: CharacterDialogue[];
}

export interface JournalPageDef {
  id: string;
  chapter: number;
  pageNumber: number;
  title: string;
  date: string;
  author: string;
  content: string[];
  sketchType: 'pond' | 'crystal' | 'ruins' | 'abyss' | 'stars' | 'guardian' | 'rod';
  hintForNext: string;
}

export interface StoryQuestDef {
  id: string;
  chapter: number;
  title: string;
  description: string;
  targetType: 'catch_count' | 'reach_location' | 'boat_tier' | 'catch_variant' | 'feed_visitor' | 'find_artifact';
  targetValue: number | string;
  rewardCoins: number;
  rewardPearls: number;
  rewardJournalPageId?: string;
  rewardArtifactId?: string;
}

export interface StoryArtifactDef {
  id: string;
  name: string;
  chapter: number;
  icon: string;
  description: string;
  lore: string;
  passiveBonus: string;
  guardianName: string;
}

export interface StoryChapterDef {
  chapter: number;
  title: string;
  subtitle: string;
  description: string;
  locationRequirement: string;
  guardianName: string;
  guardianTitle: string;
  icon: string;
  rewardPearls: number;
  summaryWhenComplete: string;
}

export interface StoryState {
  currentChapter: number;
  completedChapters: number[];
  collectedPageIds: string[];
  readPageIds: string[];
  collectedArtifactIds: string[];
  completedQuestIds: string[];
  readDialogueIds: string[];
  bubblesAffection: number; // 0 - 100
  lastBottleSpawnTime?: number;
  storyCompleted: boolean;
}
