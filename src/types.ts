export type RoomType =
  | 'homepage'
  | 'navigation-room'
  | 'buzz-room'
  | 'einstein-room'
  | 'godmode-room'
  | 'library-room'
  | 'memory-room'
  | 'voice-room';

export interface ChatAttachment {
  name: string;
  type: string;
  data: string; // Base64 data URL
  isImage: boolean;
  isText?: boolean;
  textContent?: string;
}

export interface GroundingSource {
  title: string;
  url: string;
  snippet?: string;
}

export interface GroundingMetadata {
  webSearchQueries?: string[];
  sources?: GroundingSource[];
  wasGrounded?: boolean;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  attachment?: ChatAttachment | null;
  timestamp: number;
  groundingMetadata?: GroundingMetadata | null;
  modelUsed?: string;
  isVoice?: boolean;
  audioData?: string;
}

export interface TaskItem {
  id: string;
  text: string;
  completed?: boolean;
}

export interface TasksByDate {
  [dateKey: string]: TaskItem[];
}

export interface ProjectItem {
  id: string;
  text: string;
  createdAt: number;
}

export interface MemoryItem {
  id: string;
  category:
    | 'school'
    | 'personal'
    | 'business'
    | 'family'
    | 'identity'
    | 'goal'
    | 'milestone'
    | 'growth'
    | 'need'
    | 'tone_profile'
    | 'statement';
  title: string;
  content: string;
  source: 'base' | 'system' | 'user' | 'voice_extracted' | 'grown';
  createdAt: number;
  updatedAt: number;
}

export interface UserNeedItem {
  id: string;
  need: string;
  category: 'school' | 'business' | 'personal' | 'growth';
  status: 'active' | 'in_progress' | 'resolved';
  timestamp: number;
  room?: string;
}

export interface UserStatementItem {
  id: string;
  quote: string;
  context?: string;
  timestamp: number;
  room?: string;
}

export interface UserToneProfile {
  mood: string;
  energy: 'high' | 'focused' | 'calm' | 'reflective' | 'intense';
  toneDirective: string;
  lastUpdated: number;
  summary: string;
}

export interface IntelligenceState {
  level: number;
  levelTitle: string;
  xp: number;
  totalInsightsLearned: number;
  currentTone: UserToneProfile;
  recentNeeds: UserNeedItem[];
  coreStatements: UserStatementItem[];
}

export interface VoiceDialogueTurn {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: number;
  audioData?: string;
  room?: 'buzz' | 'einstein' | 'godmode' | 'general';
}

export interface VoiceConversation {
  id: string;
  title: string;
  transcript: string;
  aiResponse?: string;
  dialogue?: VoiceDialogueTurn[];
  summary: string;
  room: 'buzz' | 'einstein' | 'godmode' | 'general';
  duration: number; // in seconds
  audioData?: string;
  keyTakeaways: string[];
  timestamp: number;
}

